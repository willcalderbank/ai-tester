<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDoc, doc, type Firestore } from 'firebase/firestore'
import { MODELS } from '~/models'

definePageMeta({
  ssr: false
})

const route = useRoute()
const sessionId = route.params.id as string

const sessionDoc = ref<any>(null)
const presetDoc = ref<any>(null)
const notFound = ref(false)
const isLoadingSession = ref(true)
const textInput = ref('')
const imageUrl = ref<string>('')
const messagesEnd = ref<HTMLDivElement | null>(null)
const systemPromptExpanded = ref(false)

// Load session on mount
onMounted(async () => {
  const { $db } = useNuxtApp() as { $db: Firestore | undefined }
  if (!$db) {
    notFound.value = true
    isLoadingSession.value = false
    return
  }

  try {
    const snap = await getDoc(doc($db, 'sessions', sessionId))
    if (!snap.exists()) {
      notFound.value = true
    } else {
      sessionDoc.value = snap.data()
      // Load preset to get cache settings
      const presetId = sessionDoc.value.presetId
      if (presetId) {
        const presetSnap = await getDoc(doc($db, 'presets', presetId))
        if (presetSnap.exists()) {
          presetDoc.value = presetSnap.data()
        }
      }
    }
  } catch (err) {
    notFound.value = true
  } finally {
    isLoadingSession.value = false
  }
})

// Session chat state
function getLockedPreset() {
  return sessionDoc.value?.systemPrompt ?? ''
}
function getCacheTTL() {
  return presetDoc.value?.cacheTTL ?? null
}

function getAutoCacheTTL() {
  return presetDoc.value?.autoCacheTTL ?? null
}

const { messages, model, isLoading, sendMessage, loadSession } =
  useSessionChat(sessionId)

// Load messages after session is loaded
watch(sessionDoc, async (doc) => {
  if (doc) {
    await loadSession()
  }
})

// Auto-scroll
watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
)

// Send message handler
async function handleSendMessage() {
  if (!textInput.value.trim() && !imageUrl.value) return

  const text = textInput.value
  textInput.value = ''

  await sendMessage(text, imageUrl.value)
  imageUrl.value = ''
}

// Image upload
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleImageSelect() {
  if (!fileInputRef.value?.files?.[0]) return
  const file = fileInputRef.value.files[0]

  const reader = new FileReader()
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function clearImage() {
  imageUrl.value = ''
  if (fileInputRef.current) fileInputRef.value.value = ''
}

// Keyboard handler for textarea
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendMessage()
  }
}

</script>

<template>
  <!-- 404 State -->
  <div v-if="notFound" class="flex items-center justify-center h-screen bg-gray-50">
    <div class="text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2.586a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 015 19V9a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
      <p class="text-gray-600 mb-4">This chat session doesn't exist or has been deleted.</p>
      <NuxtLink
        to="/admin"
        class="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Back to Admin
      </NuxtLink>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else-if="isLoadingSession" class="flex items-center justify-center h-screen bg-gray-50">
    <div class="text-center">
      <div class="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p class="text-gray-600">Loading session...</p>
    </div>
  </div>

  <!-- Chat UI -->
  <div v-else class="flex flex-col h-screen bg-gray-50">
    <!-- Header (Admin Only) -->
    <header v-if="route.query.admin === 'true'" class="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-4">
      <div class="flex items-center justify-between w-full max-w-7xl mx-auto">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin"
            class="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Back to Admin"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <h1 class="font-bold text-gray-900">{{ sessionDoc?.presetName }}</h1>
        </div>
        <div class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
          {{ MODELS.find(m => m.id === model)?.label || 'Unknown Model' }}
        </div>
      </div>
    </header>

    <!-- Content -->
    <div :class="['flex flex-1 overflow-hidden', route.query.admin === 'true' ? 'pt-14' : '']">
      <div class="flex flex-col flex-1 overflow-hidden">
        <!-- Locked Preset Display (Admin Only) -->
        <div v-if="route.query.admin === 'true'" class="p-4 border-b border-amber-200 bg-amber-50">
          <div class="max-w-5xl mx-auto">
            <div class="flex items-start gap-3">
              <div class="w-5 h-5 text-amber-600 shrink-0 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <p class="font-semibold text-amber-900">System Prompt (Locked)</p>
                  <button
                    @click="systemPromptExpanded = !systemPromptExpanded"
                    class="text-xs font-medium text-amber-700 hover:text-amber-900 hover:bg-amber-100 px-2 py-1 rounded transition"
                  >
                    {{ systemPromptExpanded ? 'Collapse' : 'Expand' }}
                  </button>
                </div>
                <p :class="['text-sm text-amber-800 mt-2 whitespace-pre-wrap break-words', systemPromptExpanded ? '' : 'line-clamp-3']">
                  {{ sessionDoc?.systemPrompt }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Message List -->
        <div class="flex-1 overflow-y-auto py-4">
          <div class="max-w-5xl mx-auto">
            <!-- Empty state -->
            <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-64 text-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <svg class="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p class="text-gray-600 font-medium">Start the conversation</p>
                <p class="text-gray-400 text-sm mt-1">Send your first message to begin.</p>
              </div>
            </div>

            <!-- Messages -->
            <ChatMessage
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
            />

            <!-- Loading indicator -->
            <div v-if="isLoading" class="flex gap-3 px-4 py-3">
              <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">AI</div>
              <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0ms" />
                <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 150ms" />
                <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 300ms" />
              </div>
            </div>

            <div ref="messagesEnd" />
          </div>
        </div>

        <!-- Input -->
        <div class="p-4 border-t border-gray-200 bg-white">
          <div class="max-w-5xl mx-auto">
            <!-- Image preview -->
            <div v-if="imageUrl" class="mb-3 flex gap-2 items-end">
              <img :src="imageUrl" alt="preview" class="h-16 rounded-lg border border-gray-200" />
              <button
                @click="clearImage"
                class="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Remove
              </button>
            </div>

            <!-- Textarea and buttons -->
            <div class="flex gap-2">
              <button
                @click="fileInputRef?.click()"
                class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="Attach image"
                :disabled="isLoading"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <textarea
                v-model="textInput"
                @keydown="handleKeydown"
                placeholder="Type your message... (Shift+Enter for newline)"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows="2"
                :disabled="isLoading"
              />
              <button
                @click="handleSendMessage"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition disabled:opacity-50"
                :disabled="isLoading || (!textInput.trim() && !imageUrl)"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cost Summary (Admin Only) -->
    <div v-if="route.query.admin === 'true'">
      <CostSummary
        :messages="messages"
        :model="model"
        :system-prompt="sessionDoc?.systemPrompt"
        :cache-ttl="getCacheTTL()"
        :auto-cache-ttl="getAutoCacheTTL()"
      />
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImageSelect"
    />
  </div>
</template>
