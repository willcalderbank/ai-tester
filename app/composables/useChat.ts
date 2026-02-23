import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  inputTokens?: number
  outputTokens?: number
  cost?: number
  model?: string
}

export const MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', inputPer1M: 3.0, outputPer1M: 15.0 },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', inputPer1M: 0.8, outputPer1M: 4.0 },
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic', inputPer1M: 15.0, outputPer1M: 75.0 },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', inputPer1M: 2.5, outputPer1M: 10.0 },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', inputPer1M: 0.15, outputPer1M: 0.6 },
  { id: 'o3-mini', label: 'o3 Mini', provider: 'openai', inputPer1M: 1.1, outputPer1M: 4.4 },
]

export function calcCost(inputTokens: number, outputTokens: number, modelId: string): number {
  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0]
  return (inputTokens / 1_000_000) * model.inputPer1M + (outputTokens / 1_000_000) * model.outputPer1M
}

export function useChat() {
  const messages = useState<ChatMessage[]>('chat-messages', () => [])
  const preamble = useState<string>('chat-preamble', () => '')
  const model = useState<string>('chat-model', () => MODELS[0].id)
  const isLoading = useState<boolean>('chat-loading', () => false)
  const conversationId = useState<string | null>('chat-conversation-id', () => null)

  const conversationStarted = computed(() => messages.value.length > 0)

  const totalCost = computed(() =>
    messages.value.reduce((sum, m) => sum + (m.cost ?? 0), 0)
  )

  async function saveConversation() {
    if (import.meta.server) return
    const { $db } = useNuxtApp() as { $db: Firestore | undefined }
    if (!$db) return

    const firstUserMsg = messages.value.find((m) => m.role === 'user')
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 60) : 'Untitled'
    const payload = {
      title,
      model: model.value,
      preamble: preamble.value,
      messages: messages.value,
      updatedAt: serverTimestamp(),
    }

    if (!conversationId.value) {
      const ref = await addDoc(collection($db, 'conversations'), {
        ...payload,
        createdAt: serverTimestamp(),
      })
      conversationId.value = ref.id
    } else {
      await setDoc(doc($db, 'conversations', conversationId.value), payload, { merge: true })
    }
  }

  async function sendMessage(text: string, imageUrl?: string) {
    if (!text.trim() && !imageUrl) return
    if (isLoading.value) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      imageUrl,
    }
    messages.value.push(userMsg)
    isLoading.value = true

    try {
      const apiMessages = messages.value
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content, imageUrl: m.imageUrl }))

      const data = await $fetch('/api/chat', {
        method: 'POST',
        body: {
          model: model.value,
          system: preamble.value || undefined,
          messages: apiMessages,
        },
      }) as { content: string; usage: { input_tokens: number; output_tokens: number } }

      const cost = calcCost(data.usage.input_tokens, data.usage.output_tokens, model.value)

      userMsg.inputTokens = data.usage.input_tokens
      userMsg.model = model.value

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        outputTokens: data.usage.output_tokens,
        cost,
        model: model.value,
      }
      messages.value.push(assistantMsg)

      await saveConversation()
    } catch (err: any) {
      messages.value.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `**Error:** ${err?.data?.statusMessage ?? err?.message ?? 'Unknown error'}`,
        model: model.value,
      })
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    messages.value = []
    preamble.value = ''
    isLoading.value = false
    conversationId.value = null
  }

  return { messages, preamble, model, isLoading, conversationStarted, totalCost, sendMessage, reset, conversationId }
}
