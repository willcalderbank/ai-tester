import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore'

export interface ConversationMeta {
  id: string
  title: string
  model: string
  updatedAt: Timestamp | null
}

export function useConversations() {
  const { $db } = useNuxtApp() as { $db: Firestore }
  const { messages, preamble, model, reset } = useChat()
  const conversationId = useState<string | null>('chat-conversation-id', () => null)

  const conversations = useState<ConversationMeta[]>('conversation-list', () => [])

  async function fetchConversations() {
    if (!$db) return
    const q = query(collection($db, 'conversations'), orderBy('updatedAt', 'desc'))
    const snap = await getDocs(q)
    conversations.value = snap.docs.map((d) => ({
      id: d.id,
      title: d.data().title ?? 'Untitled',
      model: d.data().model ?? '',
      updatedAt: d.data().updatedAt ?? null,
    }))
  }

  async function loadConversation(id: string) {
    if (!$db) return
    const snap = await getDoc(doc($db, 'conversations', id))
    if (!snap.exists()) return
    const data = snap.data()
    messages.value = data.messages ?? []
    preamble.value = data.preamble ?? ''
    model.value = data.model ?? model.value
    conversationId.value = id
  }

  async function deleteConversation(id: string) {
    if (!$db) return
    await deleteDoc(doc($db, 'conversations', id))
    if (conversationId.value === id) {
      reset()
    }
    conversations.value = conversations.value.filter((c) => c.id !== id)
  }

  return { conversations, fetchConversations, loadConversation, deleteConversation, conversationId }
}
