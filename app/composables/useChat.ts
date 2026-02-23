export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  inputTokens?: number
  outputTokens?: number
  cost?: number
  model?: string
}

export const MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', inputPer1M: 3.0, outputPer1M: 15.0 },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', inputPer1M: 0.8, outputPer1M: 4.0 },
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', inputPer1M: 15.0, outputPer1M: 75.0 },
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

  const conversationStarted = computed(() => messages.value.length > 0)

  const totalCost = computed(() =>
    messages.value.reduce((sum, m) => sum + (m.cost ?? 0), 0)
  )

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading.value) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
    }
    messages.value.push(userMsg)
    isLoading.value = true

    try {
      const apiMessages = messages.value
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))

      const data = await $fetch('/api/chat', {
        method: 'POST',
        body: {
          model: model.value,
          system: preamble.value || undefined,
          messages: apiMessages,
        },
      }) as { content: string; usage: { input_tokens: number; output_tokens: number } }

      const cost = calcCost(data.usage.input_tokens, data.usage.output_tokens, model.value)

      // attach tokens/cost to user message (input tokens represent this turn's send)
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
  }

  return { messages, preamble, model, isLoading, conversationStarted, totalCost, sendMessage, reset }
}
