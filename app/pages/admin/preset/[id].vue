<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDoc, doc, type Firestore } from 'firebase/firestore'
import { MODELS } from '../../../models'

const route = useRoute()
const presetId = route.params.id as string

const presetName = ref('')
const systemPrompt = ref('')
const modelId = ref('')
const temperature = ref(1)
const maxTokens = ref<number | null>(null)
const cacheTTL = ref<'5min' | '1h' | null>(null)
const autoCacheTTL = ref<'5min' | '1h' | null>(null)
const contextCompaction = ref(false)
const isLoading = ref(true)
const notFound = ref(false)

onMounted(async () => {
  const { $db } = useNuxtApp() as { $db: Firestore | undefined }
  if (!$db) {
    notFound.value = true
    isLoading.value = false
    return
  }

  try {
    const snap = await getDoc(doc($db, 'presets', presetId))
    if (!snap.exists()) {
      notFound.value = true
    } else {
      const data = snap.data()
      presetName.value = data.name ?? ''
      systemPrompt.value = data.systemPrompt ?? ''
      modelId.value = data.model ?? 'claude-opus-4-6'
      temperature.value = data.temperature ?? 1
      maxTokens.value = data.maxTokens ?? null
      cacheTTL.value = data.cacheTTL ?? null
      autoCacheTTL.value = data.autoCacheTTL ?? null
      contextCompaction.value = data.contextCompaction ?? false
    }
  } catch (err) {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})

function handleBack() {
  window.history.back()
}

const tokenEstimate = ref<{ tokens: number } | null>(null)
const tokenEstimateLoading = ref(false)

const tokenCost = computed(() => {
  if (!tokenEstimate.value) return null
  const md = MODELS.find((m) => m.id === modelId.value) || MODELS[0]!
  const t = tokenEstimate.value.tokens
  const use1h = cacheTTL.value === '1h' || autoCacheTTL.value === '1h'
  const cacheCreatePrice = use1h
    ? (md.cacheCreation1hPer1M ?? md.cacheCreationPer1M ?? md.inputPer1M)
    : (md.cacheCreationPer1M ?? md.inputPer1M)
  return {
    tokens: t,
    ttlLabel: use1h ? '1h' : '5min',
    inputCostPerCall: (t / 1_000_000) * md.inputPer1M,
    cacheCreateCostPerCall: (t / 1_000_000) * cacheCreatePrice,
    cacheReadCostPerCall: (t / 1_000_000) * (md.cacheReadPer1M ?? 0),
  }
})

async function estimateTokens() {
  tokenEstimateLoading.value = true
  tokenEstimate.value = null
  try {
    const res = await fetch('/api/count-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId.value, system: systemPrompt.value }),
    })
    const data = await res.json() as { inputTokens: number }
    tokenEstimate.value = { tokens: data.inputTokens }
  } finally {
    tokenEstimateLoading.value = false
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
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Preset Not Found</h1>
      <p class="text-gray-600 mb-4">This preset doesn't exist or has been deleted.</p>
      <NuxtLink
        to="/admin"
        class="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Back to Admin
      </NuxtLink>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else-if="isLoading" class="flex items-center justify-center h-screen bg-gray-50">
    <div class="text-center">
      <div class="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p class="text-gray-600">Loading preset...</p>
    </div>
  </div>

  <!-- Form -->
  <div v-else class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">View Preset</h1>
            <p class="text-gray-600 text-sm mt-1">Read-only view of this preset template</p>
          </div>
          <button
            @click="handleBack"
            class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- View -->
    <div class="max-w-4xl mx-auto px-6 py-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <!-- Name -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Preset Name
          </label>
          <p class="text-gray-900">{{ presetName }}</p>
        </div>

        <!-- System Prompt -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            System Prompt
          </label>
          <pre class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">{{ systemPrompt }}</pre>
        </div>

        <!-- Model -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Model
          </label>
          <div class="border border-gray-200 rounded-lg overflow-hidden text-xs">
            <table class="w-full table-fixed">
              <colgroup>
                <col class="w-[30%]" />
                <col class="w-[14%]" />
                <col class="w-[14%]" />
                <col class="w-[14%]" />
                <col class="w-[14%]" />
                <col class="w-[14%]" />
              </colgroup>
              <thead class="bg-gray-50 text-gray-500 uppercase tracking-wide">
                <tr>
                  <th class="px-3 py-2 text-left font-semibold">Model</th>
                  <th class="px-3 py-2 text-right font-semibold">Input</th>
                  <th class="px-3 py-2 text-right font-semibold">Output</th>
                  <th class="px-3 py-2 text-right font-semibold">Cache 5m</th>
                  <th class="px-3 py-2 text-right font-semibold">Cache 1h</th>
                  <th class="px-3 py-2 text-right font-semibold">Cache Read</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in MODELS"
                  :key="m.id"
                  :class="[
                    'border-t border-gray-100',
                    m.id === modelId ? 'bg-indigo-50' : ''
                  ]"
                >
                  <td class="px-3 py-2 font-medium text-gray-900 truncate">
                    <span v-if="m.id === modelId" class="text-indigo-600">✓ </span>{{ m.label }}
                  </td>
                  <td class="px-3 py-2 text-right text-gray-700 font-mono">${{ m.inputPer1M }}</td>
                  <td class="px-3 py-2 text-right text-gray-700 font-mono">${{ m.outputPer1M }}</td>
                  <td class="px-3 py-2 text-right font-mono" :class="m.cacheCreationPer1M ? 'text-gray-700' : 'text-gray-400'">
                    {{ m.cacheCreationPer1M ? `$${m.cacheCreationPer1M}` : '—' }}
                  </td>
                  <td class="px-3 py-2 text-right font-mono" :class="m.cacheCreation1hPer1M ? 'text-gray-700' : 'text-gray-400'">
                    {{ m.cacheCreation1hPer1M ? `$${m.cacheCreation1hPer1M}` : '—' }}
                  </td>
                  <td class="px-3 py-2 text-right font-mono" :class="m.cacheReadPer1M ? 'text-gray-700' : 'text-gray-400'">
                    {{ m.cacheReadPer1M ? `$${m.cacheReadPer1M}` : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-gray-400">Per 1M tokens.</p>
          </div>
        </div>

        <!-- Temperature -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Temperature
          </label>
          <p class="text-gray-900">{{ temperature.toFixed(1) }}</p>
        </div>

        <!-- Max Tokens -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Max Output Tokens</label>
          <p class="text-gray-900">{{ maxTokens ?? 'Default (4096)' }}</p>
        </div>

        <!-- Caching Strategy -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Caching Strategy
          </label>
          <div class="space-y-2">
            <div v-if="autoCacheTTL !== null" class="bg-green-50 border border-green-200 rounded p-3">
              <p class="text-sm font-semibold text-gray-900 mb-1">Automatic Caching</p>
              <p class="text-xs text-gray-600 mb-2">System prompt and recent messages are cached automatically</p>
              <p class="text-xs font-semibold text-gray-600 mb-1">Cache TTL: {{ autoCacheTTL === '5min' ? '5 minutes (1.25x)' : '1 hour (2x)' }}</p>
              <p class="text-xs text-gray-600">{{ autoCacheTTL === '5min' ? 'Cheaper per write but shorter expiration' : 'Higher write cost but longer persistence' }}</p>
            </div>
            <div v-if="cacheTTL !== null" class="bg-blue-50 border border-blue-200 rounded p-3">
              <p class="text-sm font-semibold text-gray-900 mb-1">Manual System Prompt Caching</p>
              <p class="text-xs text-gray-600 mb-2">System prompt only is cached</p>
              <p class="text-xs font-semibold text-gray-600 mb-1">Cache TTL: {{ cacheTTL === '5min' ? '5 minutes (1.25x)' : '1 hour (2x)' }}</p>
              <p class="text-xs text-gray-600">{{ cacheTTL === '5min' ? 'Cheaper per write but shorter expiration' : 'Higher write cost but longer persistence' }}</p>
            </div>
            <div v-if="autoCacheTTL === null && cacheTTL === null" class="text-gray-600">
              <p class="text-sm">No caching enabled</p>
            </div>
          </div>
        </div>

        <!-- Context Compaction -->
        <div v-if="MODELS.find((m) => m.id === modelId)?.supportsCompaction">
          <label class="block text-sm font-semibold text-gray-700 mb-2">Context Compaction</label>
          <div v-if="contextCompaction" class="bg-indigo-50 border border-indigo-200 rounded p-3">
            <p class="text-sm font-semibold text-indigo-800 mb-1">Enabled</p>
            <p class="text-xs text-indigo-700">Automatically summarizes old context when approaching the token limit (beta: <code class="font-mono bg-indigo-100 px-1 rounded">compact-2026-01-12</code>)</p>
          </div>
          <p v-else class="text-sm text-gray-600">Disabled</p>
        </div>

        <!-- Token/Cost Estimate -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">System Prompt Cost</label>
          <button
            @click="estimateTokens"
            :disabled="!systemPrompt || tokenEstimateLoading"
            class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {{ tokenEstimateLoading ? 'Counting…' : 'Calculate Token Cost' }}
          </button>

          <div v-if="tokenCost" class="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm space-y-1">
            <div class="text-indigo-800">
              <span class="font-semibold">Tokens:</span>
              <span class="font-mono ml-1">{{ tokenCost.tokens.toLocaleString() }}</span>
            </div>
            <div class="text-indigo-700">
              <span class="font-semibold">Uncached per call:</span>
              <span class="font-mono ml-1">${{ tokenCost.inputCostPerCall.toFixed(5) }}</span>
            </div>
            <div class="text-indigo-700">
              <span class="font-semibold">Cache write ({{ tokenCost.ttlLabel }}):</span>
              <span class="font-mono ml-1">${{ tokenCost.cacheCreateCostPerCall.toFixed(5) }}</span>
            </div>
            <div class="text-indigo-700">
              <span class="font-semibold">Cache read per call:</span>
              <span class="font-mono ml-1">${{ tokenCost.cacheReadCostPerCall.toFixed(5) }}</span>
            </div>
            <div v-if="tokenCost.tokens < 1024" class="pt-1 text-amber-700 text-xs">
              Under 1,024 tokens — caching will not be applied by Anthropic.
            </div>
          </div>
        </div>

        <!-- Back Button -->
        <div class="flex gap-3 pt-4">
          <button
            @click="handleBack"
            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
