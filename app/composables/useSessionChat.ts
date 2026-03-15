import { getDoc, doc, type Firestore } from 'firebase/firestore'
import { MODELS, type SessionMessage } from '../models'

export function useSessionChat(sessionId: string) {
  const messages = useState<SessionMessage[]>(`session-messages-${sessionId}`, () => [])
  const model = useState<string>(`session-model-${sessionId}`, () => MODELS[0]!.id)
  const temperature = useState<number>(`session-temperature-${sessionId}`, () => 1)
  const isLoading = useState<boolean>(`session-loading-${sessionId}`, () => false)

  async function loadSession() {
    if (import.meta.server) return
    const { $db } = useNuxtApp() as { $db: Firestore | undefined }
    if (!$db) return

    const snap = await getDoc(doc($db, 'sessions', sessionId))
    if (!snap.exists()) return

    const data = snap.data()
    messages.value = data.messages ?? []
    model.value = data.model ?? MODELS[0]!.id
    temperature.value = data.temperature ?? 1
  }

  async function sendMessage(text: string, imageUrl?: string) {
    if (!text.trim() && !imageUrl) return
    if (isLoading.value) return

    const userMsg: SessionMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      imageUrl,
    }
    messages.value.push(userMsg)
    isLoading.value = true

    try {
      const data = await $fetch('/api/session-chat', {
        method: 'POST',
        body: { sessionId, message: text.trim(), imageUrl },
      }) as {
        content: string
        cacheTTL: '5min' | '1h' | null
        usage: {
          input_tokens: number
          output_tokens: number
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
        }
      }

      const cacheCreationTokens = data.usage.cache_creation_input_tokens ?? 0
      const cacheReadTokens = data.usage.cache_read_input_tokens ?? 0

      userMsg.inputTokens = data.usage.input_tokens
      userMsg.cacheCreationTokens = cacheCreationTokens
      userMsg.cacheReadTokens = cacheReadTokens
      userMsg.model = model.value

      const assistantMsg: SessionMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        outputTokens: data.usage.output_tokens,
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

  return { messages, model, temperature, isLoading, sendMessage, loadSession }
}
