<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import { calcCost } from '~/models'

const {
  presets,
  sessions,
  fetchPresets,
  deletePreset,
  fetchSessions,
  spawnSession,
  deleteSession,
} = usePresets()

const MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'gpt-4o', label: 'GPT-4o' },
]

const selectedPresetId = ref<string | null>(null)
const sessionName = ref('')
const showCopiedToast = ref(false)

const selectedPreset = computed(() =>
  presets.value.find((p) => p.id === selectedPresetId.value)
)

onMounted(async () => {
  await fetchPresets()
})

watch(selectedPresetId, async (id) => {
  if (id) {
    await fetchSessions(id)
  }
})

async function handleDeletePreset(id: string) {
  if (confirm('Delete this preset? This will not delete existing sessions.')) {
    await deletePreset(id)
    if (selectedPresetId.value === id) {
      selectedPresetId.value = null
      sessions.value = []
    }
  }
}

async function handleSpawnSession() {
  if (!selectedPreset.value) return
  const sessionId = await spawnSession(selectedPreset.value, sessionName.value)
  if (sessionId) {
    const url = `${location.origin}/chat/${sessionId}`
    await navigator.clipboard.writeText(url)
    showCopiedToast.value = true
    setTimeout(() => {
      showCopiedToast.value = false
    }, 2000)
    sessionName.value = ''
    await fetchSessions(selectedPresetId.value!)
  }
}

async function handleDeleteSession(id: string) {
  if (confirm('Delete this session?')) {
    await deleteSession(id)
  }
}

async function handleCopySessionUrl(sessionId: string) {
  const url = `${location.origin}/chat/${sessionId}`
  await navigator.clipboard.writeText(url)
  showCopiedToast.value = true
  setTimeout(() => {
    showCopiedToast.value = false
  }, 2000)
}

function formatDate(ts: Timestamp | null) {
  if (!ts) return 'Unknown'
  return formatDistanceToNow(ts.toDate(), { addSuffix: true })
}

function getSessionStats(session: any) {
  let totalCost = 0
  let inputTokens = 0
  let outputTokens = 0

  if (session.messages && Array.isArray(session.messages)) {
    for (const msg of session.messages) {
      if (msg.cost) totalCost += msg.cost
      if (msg.inputTokens) inputTokens += msg.inputTokens
      if (msg.outputTokens) outputTokens += msg.outputTokens
    }
  }

  return { totalCost, inputTokens, outputTokens }
}
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Left Panel: Presets -->
    <aside class="w-80 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-lg font-bold text-gray-900">Presets</h1>
          <NuxtLink
            to="/admin/preset/new"
            class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            New
          </NuxtLink>
        </div>
      </div>

      <!-- Preset List -->
      <div class="flex-1 overflow-y-auto divide-y">
        <div
          v-for="preset in presets"
          :key="preset.id"
          :class="[
            'p-3 cursor-pointer border-l-4 transition',
            selectedPresetId === preset.id
              ? 'border-l-indigo-600 bg-indigo-50'
              : 'border-l-transparent hover:bg-gray-50',
          ]"
        >
          <div class="flex items-start justify-between">
            <div
              @click="selectedPresetId = preset.id"
              class="flex-1 min-w-0"
            >
              <p class="font-medium text-gray-900 truncate">{{ preset.name }}</p>
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                {{ preset.systemPrompt || '(No system prompt)' }}
              </p>
            </div>
            <div class="flex gap-1 ml-2 shrink-0">
              <NuxtLink
                :to="`/admin/preset/${preset.id}`"
                class="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                title="Edit"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </NuxtLink>
              <button
                @click.stop="handleDeletePreset(preset.id)"
                class="p-1.5 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="presets.length === 0" class="p-4 text-center text-gray-500 text-sm">
          No presets yet. Create one to get started.
        </div>
      </div>
    </aside>

    <!-- Right Panel: Sessions -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <div v-if="selectedPreset" class="flex flex-col h-full">
        <!-- Preset header -->
        <div class="p-6 border-b border-gray-200 bg-white">
          <h2 class="text-2xl font-bold text-gray-900">{{ selectedPreset.name }}</h2>
          <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-xs font-semibold text-amber-900 mb-2">System Prompt (Locked in Sessions)</p>
            <p class="text-sm text-amber-800 whitespace-pre-wrap line-clamp-3">{{ selectedPreset.systemPrompt }}</p>
          </div>
        </div>

        <!-- Sessions section -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="space-y-4">
            <!-- Spawn button -->
            <div class="pb-4 border-b border-gray-200">
              <label class="block text-xs font-semibold text-gray-700 mb-2">
                Session Name (Optional)
              </label>
              <input
                v-model="sessionName"
                type="text"
                placeholder="e.g., Support User #1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 text-sm"
              />
              <button
                @click="handleSpawnSession"
                class="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Spawn Session
              </button>
              <p class="text-xs text-gray-500 mt-2">Uses the model from the preset settings</p>
            </div>

            <!-- Sessions list -->
            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-gray-700">Active Sessions</h3>
              <div v-if="sessions.length === 0" class="text-center py-8 text-gray-500">
                No sessions yet. Spawn one above.
              </div>
              <div
                v-for="session in sessions"
                :key="session.id"
                class="p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">{{ session.title }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                      Created {{ formatDate(session.createdAt) }}
                    </p>
                    <div v-if="getSessionStats(session).totalCost > 0" class="text-xs text-gray-600 mt-2">
                      <span class="font-semibold text-emerald-600">${{ getSessionStats(session).totalCost.toFixed(4) }}</span>
                      <span class="text-gray-500"> • </span>
                      <span>{{ getSessionStats(session).inputTokens.toLocaleString() }} in / {{ getSessionStats(session).outputTokens.toLocaleString() }} out</span>
                    </div>
                  </div>
                  <button
                    @click="handleDeleteSession(session.id)"
                    class="p-1.5 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded shrink-0"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div class="flex gap-2">
                  <NuxtLink
                    :to="`/chat/${session.id}?admin=true`"
                    class="flex-1 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium text-center"
                  >
                    Go To Chat
                  </NuxtLink>
                  <button
                    @click="handleCopySessionUrl(session.id)"
                    class="flex-1 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 font-medium"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center flex-1 text-center text-gray-500">
        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium">Select a preset to manage sessions</p>
      </div>
    </main>

    <!-- Toast notification -->
    <div
      v-if="showCopiedToast"
      class="fixed bottom-4 right-4 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg animate-bounce"
    >
      ✓ URL copied to clipboard!
    </div>
  </div>
</template>
