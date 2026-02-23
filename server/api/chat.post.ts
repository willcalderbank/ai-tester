import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const OPENAI_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'o3-mini'])

function toAnthropicMessages(messages: any[]) {
  return messages.map((m) => {
    if (m.imageUrl) {
      return {
        role: m.role,
        content: [
          { type: 'image', source: { type: 'url', url: m.imageUrl } },
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

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { model, system, messages } = body

  if (OPENAI_MODELS.has(model)) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY not configured in .env' })
    }
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model,
      messages: toOpenAIMessages(system, messages),
    })
    return {
      content: response.choices[0]?.message?.content ?? '',
      usage: {
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      },
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw createError({ statusCode: 500, statusMessage: 'ANTHROPIC_API_KEY not configured in .env' })
  }
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: system || undefined,
    messages: toAnthropicMessages(messages),
  })
  return {
    content: response.content[0].type === 'text' ? response.content[0].text : '',
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
})
