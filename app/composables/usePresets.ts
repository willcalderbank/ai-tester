import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore'

export interface Preset {
  id: string
  name: string
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number | null
  cacheTTL: '5min' | '1h' | null
  autoCacheTTL: '5min' | '1h' | null
  contextCompaction: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface Session {
  id: string
  presetId: string
  presetName: string
  systemPrompt: string
  title: string
  model: string
  temperature: number
  messages: any[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export function usePresets() {
  const { $db } = useNuxtApp() as { $db: Firestore | undefined }

  const presets = useState<Preset[]>('preset-list', () => [])
  const sessions = useState<Session[]>('session-list', () => [])

  async function fetchPresets() {
    if (!$db) return
    const q = query(collection($db, 'presets'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    presets.value = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? 'Untitled',
      systemPrompt: d.data().systemPrompt ?? '',
      model: d.data().model ?? 'claude-opus-4-6',
      temperature: d.data().temperature ?? 1,
      maxTokens: d.data().maxTokens ?? null,
      cacheTTL: d.data().cacheTTL ?? null,
      autoCacheTTL: d.data().autoCacheTTL ?? null,
      contextCompaction: d.data().contextCompaction ?? false,
      createdAt: d.data().createdAt ?? null,
      updatedAt: d.data().updatedAt ?? null,
    }))
  }

  async function createPreset(name: string, systemPrompt: string, model: string = 'claude-opus-4-6', temperature: number = 1, cacheTTL: '5min' | '1h' | null = null, autoCacheTTL: '5min' | '1h' | null = null, contextCompaction: boolean = false, maxTokens: number | null = null) {
    if (!$db) return null
    const ref = await addDoc(collection($db, 'presets'), {
      name,
      systemPrompt,
      model,
      temperature,
      maxTokens,
      cacheTTL,
      autoCacheTTL,
      contextCompaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  async function updatePreset(id: string, name: string, systemPrompt: string, model: string = 'claude-opus-4-6', temperature: number = 1, cacheTTL: '5min' | '1h' | null = null, autoCacheTTL: '5min' | '1h' | null = null, contextCompaction: boolean = false, maxTokens: number | null = null) {
    if (!$db) return
    await setDoc(
      doc($db, 'presets', id),
      {
        name,
        systemPrompt,
        model,
        temperature,
        maxTokens,
        cacheTTL,
        autoCacheTTL,
        contextCompaction,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }

  async function getPreset(id: string): Promise<Preset | null> {
    if (!$db) return null
    const snap = await getDoc(doc($db, 'presets', id))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      id: snap.id,
      name: d.name ?? 'Untitled',
      systemPrompt: d.systemPrompt ?? '',
      model: d.model ?? 'claude-opus-4-6',
      temperature: d.temperature ?? 1,
      maxTokens: d.maxTokens ?? null,
      cacheTTL: d.cacheTTL ?? null,
      autoCacheTTL: d.autoCacheTTL ?? null,
      contextCompaction: d.contextCompaction ?? false,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    }
  }

  async function deletePreset(id: string) {
    if (!$db) return
    await deleteDoc(doc($db, 'presets', id))
    presets.value = presets.value.filter((p) => p.id !== id)
  }

  async function fetchSessions(presetId: string) {
    if (!$db) return
    const q = query(
      collection($db, 'sessions'),
      where('presetId', '==', presetId),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    sessions.value = snap.docs.map((d) => ({
      id: d.id,
      presetId: d.data().presetId ?? '',
      presetName: d.data().presetName ?? '',
      systemPrompt: d.data().systemPrompt ?? '',
      title: d.data().title ?? 'New session',
      model: d.data().model ?? 'claude-opus-4-6',
      temperature: d.data().temperature ?? 1,
      messages: d.data().messages ?? [],
      createdAt: d.data().createdAt ?? null,
      updatedAt: d.data().updatedAt ?? null,
    }))
  }

  async function spawnSession(preset: Preset, sessionName: string = 'New session') {
    if (!$db) return null
    const sessionId = crypto.randomUUID()
    await setDoc(doc($db, 'sessions', sessionId), {
      presetId: preset.id,
      presetName: preset.name,
      systemPrompt: preset.systemPrompt,
      title: sessionName,
      model: preset.model,
      temperature: preset.temperature,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return sessionId
  }

  async function deleteSession(id: string) {
    if (!$db) return
    await deleteDoc(doc($db, 'sessions', id))
    sessions.value = sessions.value.filter((s) => s.id !== id)
  }

  return {
    presets,
    sessions,
    fetchPresets,
    getPreset,
    createPreset,
    updatePreset,
    deletePreset,
    fetchSessions,
    spawnSession,
    deleteSession,
  }
}
