<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { MODELS } from '~/models'

const route = useRoute()
const { createPreset, getPreset } = usePresets()

const formName = ref('')
const formSystemPrompt = ref('')
const selectedModel = ref(MODELS[0]!.id)
const formTemperature = ref(0.5)
const formMaxTokens = ref<number | null>(null)
const cacheTTL = ref<'5min' | '1h' | null>(null)
const autoCacheTTL = ref<'5min' | '1h' | null>(null)
const contextCompaction = ref(false)
const isSaving = ref(false)

onMounted(async () => {
  const fromId = route.query.from as string | undefined
  if (!fromId) return
  const preset = await getPreset(fromId)
  if (!preset) return
  formName.value = preset.name + ' (copy)'
  formSystemPrompt.value = preset.systemPrompt
  selectedModel.value = preset.model
  formTemperature.value = preset.temperature
  formMaxTokens.value = preset.maxTokens
  cacheTTL.value = preset.cacheTTL
  autoCacheTTL.value = preset.autoCacheTTL
  contextCompaction.value = preset.contextCompaction
})

const selectedModelDef = computed(() => MODELS.find((m) => m.id === selectedModel.value) ?? MODELS[0]!)

async function handleSave() {
  if (!formName.value.trim()) {
    alert('Please enter a preset name')
    return
  }

  isSaving.value = true
  try {
    const id = await createPreset(formName.value, formSystemPrompt.value, selectedModel.value, formTemperature.value, cacheTTL.value, autoCacheTTL.value, contextCompaction.value, formMaxTokens.value)
    if (id) {
      window.location.href = '/admin'
    }
  } catch (err) {
    alert('Failed to create preset: ' + (err as any).message)
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  window.history.back()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Create Preset</h1>
            <p class="text-gray-600 text-sm mt-1">Define a new system prompt template for chat sessions</p>
          </div>
          <button
            @click="handleCancel"
            class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Form -->
    <div class="max-w-4xl mx-auto px-6 py-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <!-- Name Field -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Preset Name
          </label>
          <input
            v-model="formName"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">A short, descriptive name for this preset</p>
        </div>

        <!-- System Prompt Field -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            System Prompt
          </label>
          <textarea
            v-model="formSystemPrompt"
            rows="12"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
        </div>

        <!-- Model Selection -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Model
          </label>
          <select
            v-model="selectedModel"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="m in MODELS" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>

          <!-- Pricing table -->
          <div class="mt-3 border border-gray-200 rounded-lg overflow-hidden text-xs">
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
                  <th class="px-3 py-2 text-left font-semibold">Model (Price per million)</th>
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
                  @click="selectedModel = m.id"
                  :class="[
                    'cursor-pointer border-t border-gray-100 transition-colors',
                    selectedModel === m.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  ]"
                >
                  <td class="px-3 py-2 font-medium text-gray-900 truncate">
                    <span v-if="selectedModel === m.id" class="text-indigo-600">✓ </span>{{ m.label }}
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
            <p class="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-gray-400">Per 1M tokens. Click a row to select.</p>
          </div>
        </div>

        <!-- Temperature -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-semibold text-gray-700">
              Temperature
            </label>
            <span class="text-sm font-semibold text-gray-700">{{ formTemperature.toFixed(1) }}</span>
          </div>
          <input
            v-model.number="formTemperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            class="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">Affects response randomness (0 = deterministic, 1 = very creative)</p>
        </div>

        <!-- Max Tokens -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Max Output Tokens
          </label>
          <input
            v-model.number="formMaxTokens"
            type="number"
            min="1"
            placeholder="Default (4096)"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">Maximum tokens the model can generate per response. Leave blank for default (4096).</p>
        </div>

        <!-- Caching Strategy -->
        <div class="space-y-4">
          <label class="block text-sm font-semibold text-gray-700">Caching Strategy</label>
          <p class="text-xs text-gray-500">Enable one or both caching options for better performance</p>

          <!-- Auto Caching Option -->
          <div class="border border-gray-200 rounded-lg p-4">
            <label class="block text-sm font-semibold text-gray-700 mb-3">Automatic Caching</label>
            <p class="text-xs text-gray-500 mb-3">Caches system prompt and recent messages automatically</p>
            <div class="bg-green-50 border border-green-200 rounded p-3">
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Cache TTL:</label>
              <div class="flex gap-2">
                <button
                  @click="autoCacheTTL = null"
                  :class="[
                    'flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors',
                    autoCacheTTL === null
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  Off
                </button>
                <button
                  @click="autoCacheTTL = '5min'"
                  :class="[
                    'flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors',
                    autoCacheTTL === '5min'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  5 min (1.25x)
                </button>
                <button
                  @click="autoCacheTTL = '1h'"
                  :class="[
                    'flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors',
                    autoCacheTTL === '1h'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  1 hour (2x)
                </button>
              </div>
            </div>
          </div>

          <!-- Manual System Prompt Caching Option -->
          <div class="border border-gray-200 rounded-lg p-4">
            <label class="block text-sm font-semibold text-gray-700 mb-3">Manual System Prompt Caching</label>
            <p class="text-xs text-gray-500 mb-3">Caches only the system prompt with configurable TTL</p>
            <div class="bg-blue-50 border border-blue-200 rounded p-3">
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Cache TTL:</label>
              <div class="flex gap-2">
                <button
                  @click="cacheTTL = null"
                  :class="[
                    'flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors',
                    cacheTTL === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  Off
                </button>
                <button
                  @click="cacheTTL = '5min'"
                  :class="[
                    'flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors',
                    cacheTTL === '5min'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  5 min (1.25x)
                </button>
                <button
                  @click="cacheTTL = '1h'"
                  :class="[
                    'flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors',
                    cacheTTL === '1h'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  1 hour (2x)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Context Compaction -->
        <div v-if="selectedModelDef.supportsCompaction" class="border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <div>
              <label class="block text-sm font-semibold text-gray-700">Context Compaction</label>
              <p class="text-xs text-gray-500 mt-0.5">Automatically summarizes old context when approaching the token limit (beta)</p>
            </div>
            <button
              @click="contextCompaction = !contextCompaction"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                contextCompaction ? 'bg-indigo-600' : 'bg-gray-300'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  contextCompaction ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
          <div v-if="contextCompaction" class="mt-2 bg-indigo-50 border border-indigo-200 rounded p-3 text-xs text-indigo-700">
            Compaction triggers at ~150k input tokens. The conversation summary is stored and replayed on subsequent turns. Requires <code class="font-mono bg-indigo-100 px-1 rounded">compact-2026-01-12</code> beta.
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <button
            @click="handleSave"
            :disabled="isSaving"
            class="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {{ isSaving ? 'Creating...' : 'Create Preset' }}
          </button>
          <button
            @click="handleCancel"
            :disabled="isSaving"
            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
