import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const OPENAI_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'o3-mini'])

// --- Firestore REST helpers ---

function parseFirestoreValue(val: any): any {
  if (val.stringValue !== undefined) return val.stringValue
  if (val.integerValue !== undefined) return Number(val.integerValue)
  if (val.doubleValue !== undefined) return val.doubleValue
  if (val.booleanValue !== undefined) return val.booleanValue
  if (val.nullValue !== undefined) return null
  if (val.arrayValue) return (val.arrayValue.values ?? []).map(parseFirestoreValue)
  if (val.mapValue) return parseFirestoreFields(val.mapValue.fields ?? {})
  return null
}

function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(val)
  }
  return result
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'string') return { stringValue: val }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(val)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, toFirestoreValue(v)])
        ),
      },
    }
  }
  return { nullValue: null }
}

async function fetchDoc(projectId: string, collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as any
  if (!data.fields) return null
  return parseFirestoreFields(data.fields)
}

async function patchDoc(projectId: string, collection: string, docId: string, fields: Record<string, any>) {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?${mask}`
  const firestoreFields: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = toFirestoreValue(v)
  }
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreFields }),
  })
}

// --- AI message format helpers ---

function toAnthropicMessages(messages: any[]) {
  return messages.map((m) => {
    if (m.imageUrl) {
      const dataMatch = m.imageUrl.match(/^data:([^;]+);base64,(.+)$/)
      const imageSource = dataMatch
        ? { type: 'base64' as const, media_type: dataMatch[1], data: dataMatch[2] }
        : { type: 'url' as const, url: m.imageUrl }
      return {
        role: m.role,
        content: [
          { type: 'image', source: imageSource },
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
        ],
      }
    }
    return { role: m.role, content: m.content }
  })
}

function toOpenAIMessages(system: string | undefined, messages: any[]) {
  const result: any[] = []
  if (system) result.push({ role: 'system', content: system })
  for (const m of messages) {
    if (m.imageUrl) {
      result.push({
        role: m.role,
        content: [
          { type: 'image_url', image_url: { url: m.imageUrl } },
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
        ],
      })
    } else {
      result.push({ role: m.role, content: m.content })
    }
  }
  return result
}

// --- Handler ---

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sessionId, message, imageUrl } = body

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId is required' })
  }

  const config = useRuntimeConfig()
  const projectId = config.public.firebaseProjectId as string

  if (!projectId) {
    throw createError({ statusCode: 500, statusMessage: 'firebaseProjectId not configured' })
  }

  const session = await fetchDoc(projectId, 'sessions', sessionId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const { model, systemPrompt, temperature, messages: sessionMessages, presetId } = session

  let cacheTTL: '5min' | '1h' | null = null
  let autoCacheTTL: '5min' | '1h' | null = null
  let contextCompaction = false
  let maxTokens = 4096
  if (presetId) {
    const preset = await fetchDoc(projectId, 'presets', presetId)
    if (preset) {
      cacheTTL = preset.cacheTTL ?? null
      autoCacheTTL = preset.autoCacheTTL ?? null
      contextCompaction = preset.contextCompaction ?? false
      maxTokens = preset.maxTokens ?? 4096
    }
  }

  const allMessages = [
    ...(sessionMessages ?? []).map((m: any) => ({ role: m.role, content: m.content, imageUrl: m.imageUrl })),
    { role: 'user', content: message ?? '', imageUrl: imageUrl || undefined },
  ]

  async function saveSession(usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }, responseContent: any[] | string) {
    const userMsgRecord: Record<string, any> = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message ?? '',
      model,
      inputTokens: usage.input_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    }
    if (imageUrl) userMsgRecord.imageUrl = imageUrl

    const assistantMsgRecord: Record<string, any> = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: responseContent,
      model,
      outputTokens: usage.output_tokens,
    }

    const updatedMessages = [...(sessionMessages ?? []), userMsgRecord, assistantMsgRecord]
    const firstUserMsg = updatedMessages.find((m: any) => m.role === 'user')
    const title = firstUserMsg ? String(firstUserMsg.content).slice(0, 60) : 'New session'

    await patchDoc(projectId, 'sessions', sessionId, {
      messages: updatedMessages,
      title,
      model,
    })
  }

  if (OPENAI_MODELS.has(model)) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY not configured in .env' })
    }
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model,
      temperature: temperature ?? 1,
      messages: toOpenAIMessages(systemPrompt || undefined, allMessages),
    })
    const content = response.choices[0]?.message?.content ?? ''
    const usage = {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    }
    await saveSession(usage, content)
    return { content, cacheTTL, usage }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw createError({ statusCode: 500, statusMessage: 'ANTHROPIC_API_KEY not configured in .env' })
  }
  const client = new Anthropic({ apiKey })

  let systemConfig: any
  if (systemPrompt) {
    if (cacheTTL !== null || autoCacheTTL !== null) {
      const use1h = autoCacheTTL === '1h' || cacheTTL === '1h'
      const cacheControl = use1h
        ? { type: 'ephemeral' as const, ttl: 3600 }
        : { type: 'ephemeral' as const }
      systemConfig = [{ type: 'text' as const, text: systemPrompt, cache_control: cacheControl }]
    } else {
      systemConfig = systemPrompt
    }
  }

  const requestParams: any = {
    model,
    max_tokens: maxTokens,
    temperature: Math.min(1, temperature ?? 1),
    system: systemConfig,
    messages: toAnthropicMessages(allMessages),
  }

  if (contextCompaction) {
    requestParams.context_management = { edits: [{ type: 'compact_20260112' }] }
  }

  const response = contextCompaction
    ? await client.beta.messages.create({ ...requestParams, betas: ['compact-2026-01-12'] } as any)
    : await client.messages.create(requestParams)

  const textContent = (response.content.find((b) => b.type === 'text') as any)?.text ?? ''
  const usage = {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_creation_input_tokens: (response.usage as any).cache_creation_input_tokens,
    cache_read_input_tokens: (response.usage as any).cache_read_input_tokens,
  }
  await saveSession(usage, response.content)
  return { content: textContent, cacheTTL, usage }
})
