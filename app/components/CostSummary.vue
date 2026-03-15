<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MODELS, type SessionMessage } from '../models'

const props = defineProps<{
  messages: SessionMessage[]
  model: string
  systemPrompt?: string
  cacheTtl?: '5min' | '1h' | null
  autoCacheTtl?: '5min' | '1h' | null
}>()

const showDetails = ref(false)
const expandedMsgIds = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  const s = new Set(expandedMsgIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedMsgIds.value = s
}

function textContent(content: string | any[]): string {
  if (Array.isArray(content)) {
    return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  }
  return content
}

function hasCompactionBlock(content: string | any[]): boolean {
  return Array.isArray(content) && content.some((b) => b.type === 'compaction')
}

function roleBadgeClass(role: string) {
  if (role === 'user') return 'bg-blue-500 text-white'
  if (role === 'assistant') return 'bg-amber-500 text-white'
  return 'bg-purple-500 text-white'
}

function roleLabel(role: string) {
  if (role === 'user') return 'User'
  if (role === 'assistant') return 'Assistant'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function msgCost(m: SessionMessage, modelId: string) {
  const md = MODELS.find((x) => x.id === modelId) || MODELS[0]!
  const input = (m.inputTokens ?? 0) / 1_000_000 * md.inputPer1M
  const output = (m.outputTokens ?? 0) / 1_000_000 * md.outputPer1M
  const cacheCreate = (m.cacheCreationTokens ?? 0) / 1_000_000 * (md.cacheCreationPer1M ?? md.inputPer1M)
  const cacheRead = (m.cacheReadTokens ?? 0) / 1_000_000 * (md.cacheReadPer1M ?? 0)
  return { input, output, cacheCreate, cacheRead, total: input + output + cacheCreate + cacheRead }
}

const sessionTotals = computed(() => {
  let inputTokens = 0, outputTokens = 0, cacheCreateTokens = 0, cacheReadTokens = 0
  let inputCost = 0, outputCost = 0, cacheCreateCost = 0, cacheReadCost = 0

  for (const msg of props.messages) {
    const c = msgCost(msg, msg.model || props.model)
    inputTokens += msg.inputTokens ?? 0
    outputTokens += msg.outputTokens ?? 0
    cacheCreateTokens += msg.cacheCreationTokens ?? 0
    cacheReadTokens += msg.cacheReadTokens ?? 0
    inputCost += c.input
    outputCost += c.output
    cacheCreateCost += c.cacheCreate
    cacheReadCost += c.cacheRead
  }

  return {
    inputTokens, outputTokens, cacheCreateTokens, cacheReadTokens,
    inputCost, outputCost, cacheCreateCost, cacheReadCost,
    total: inputCost + outputCost + cacheCreateCost + cacheReadCost,
  }
})

const messageDetails = computed(() => {
  let cumInputTokens = 0, cumOutputTokens = 0, cumCacheCreateTokens = 0, cumCacheReadTokens = 0
  let cumInputCost = 0, cumOutputCost = 0, cumCacheCreateCost = 0, cumCacheReadCost = 0

  return props.messages.map((msg) => {
    const c = msgCost(msg, msg.model || props.model)
    cumInputTokens += msg.inputTokens ?? 0
    cumOutputTokens += msg.outputTokens ?? 0
    cumCacheCreateTokens += msg.cacheCreationTokens ?? 0
    cumCacheReadTokens += msg.cacheReadTokens ?? 0
    cumInputCost += c.input
    cumOutputCost += c.output
    cumCacheCreateCost += c.cacheCreate
    cumCacheReadCost += c.cacheRead

    const text = textContent(msg.content)
    return {
      id: msg.id,
      role: msg.role,
      hasCompaction: hasCompactionBlock(msg.content),
      firstLine: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
      fullContent: text,
      inputTokens: msg.inputTokens ?? 0,
      outputTokens: msg.outputTokens ?? 0,
      cacheCreateTokens: msg.cacheCreationTokens ?? 0,
      cacheReadTokens: msg.cacheReadTokens ?? 0,
      ...c,
      cumInputTokens, cumOutputTokens, cumCacheCreateTokens, cumCacheReadTokens,
      cumInputCost, cumOutputCost, cumCacheCreateCost, cumCacheReadCost,
      cumTotal: cumInputCost + cumOutputCost + cumCacheCreateCost + cumCacheReadCost,
    }
  })
})

const cacheSettings = computed(() => {
  const strategies = []
  if (props.autoCacheTtl) strategies.push({ name: 'Auto Caching', ttl: props.autoCacheTtl === '1h' ? '1 hour' : '5 min' })
  if (props.cacheTtl) strategies.push({ name: 'System Prompt Cache', ttl: props.cacheTtl === '1h' ? '1 hour' : '5 min' })
  return strategies
})

const showBadge = computed(() => sessionTotals.value.total > 0)

const systemPromptTokens = ref<number | null>(null)

const systemPromptCost = computed(() => {
  if (systemPromptTokens.value === null || !props.systemPrompt) return null
  const md = MODELS.find((m) => m.id === props.model) || MODELS[0]!
  const t = systemPromptTokens.value
  const use1h = props.cacheTtl === '1h' || props.autoCacheTtl === '1h'
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

watch(
  () => [props.systemPrompt, props.model] as const,
  async ([prompt, model]) => {
    if (!prompt) { systemPromptTokens.value = null; return }
    const res = await fetch('/api/count-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, system: prompt }),
    })
    const data = await res.json() as { inputTokens: number }
    systemPromptTokens.value = data.inputTokens
  },
  { immediate: true }
)
</script>

<template>
  <!-- Badge -->
  <Transition name="pop">
    <div
      v-if="showBadge"
      class="fixed bottom-20 right-4 z-30 bg-white border border-gray-200 shadow-md rounded-lg px-3 py-2 text-xs font-medium text-gray-700 cursor-pointer hover:shadow-lg transition-shadow select-none"
      @click="showDetails = true"
    >
      <div class="text-gray-400 text-center mb-1">Session Cost</div>
      <div class="text-emerald-600 font-bold text-base text-center">${{ sessionTotals.total.toFixed(4) }}</div>
      <div class="text-gray-400 text-center mt-1">click for details</div>
    </div>
  </Transition>

  <!-- Modal -->
  <Transition name="fade">
    <div
      v-if="showDetails"
      class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      @click="showDetails = false"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 class="font-bold text-gray-900">Cost & Token Breakdown</h2>
          <button @click="showDetails = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div class="overflow-y-auto p-5 space-y-5">

          <!-- Cache Settings -->
          <div v-if="cacheSettings.length > 0" class="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm">
            <div class="font-semibold text-indigo-800 mb-1">Cache Settings</div>
            <div v-for="s in cacheSettings" :key="s.name" class="text-indigo-700">
              {{ s.name }}: <span class="font-mono">{{ s.ttl }}</span> TTL
            </div>
            <div v-if="systemPromptCost" class="mt-2 pt-2 border-t border-indigo-200 text-xs text-indigo-700 space-y-0.5">
              <div>System prompt: <span class="font-mono">{{ systemPromptCost.tokens.toLocaleString() }}</span> tokens</div>
              <div>First call: <span class="font-mono">${{ systemPromptCost.cacheCreateCostPerCall.toFixed(5) }}</span> (cache write, {{ systemPromptCost.ttlLabel }})</div>
              <div>Subsequent calls: <span class="font-mono">${{ systemPromptCost.cacheReadCostPerCall.toFixed(5) }}</span> (cache read) vs <span class="font-mono">${{ systemPromptCost.inputCostPerCall.toFixed(5) }}</span> uncached</div>
            </div>
            <div v-else-if="props.systemPrompt && systemPromptTokens === null" class="mt-2 pt-2 border-t border-indigo-200 text-xs text-indigo-500">
              Counting tokens…
            </div>
            <div
              v-if="props.messages.length > 0 && sessionTotals.cacheCreateTokens === 0"
              class="mt-2 text-amber-700 text-xs"
            >
              No cache entries created yet — system prompt must reach 1,024 tokens minimum.
            </div>
          </div>

          <!-- Session Totals -->
          <div>
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Session Total</h3>
            <table class="w-full text-sm table-fixed">
              <colgroup><col class="w-1/2"><col class="w-1/4"><col class="w-1/4"></colgroup>
              <thead>
                <tr class="text-xs text-gray-400 uppercase">
                  <th class="text-left font-medium pb-1">Type</th>
                  <th class="text-right font-medium pb-1">Tokens</th>
                  <th class="text-right font-medium pb-1">Cost</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr>
                  <td class="py-1 text-blue-700">Input</td>
                  <td class="py-1 text-right font-mono text-gray-700">{{ sessionTotals.inputTokens.toLocaleString() }}</td>
                  <td class="py-1 text-right font-mono text-gray-700">${{ sessionTotals.inputCost.toFixed(5) }}</td>
                </tr>
                <tr>
                  <td class="py-1 text-amber-700">Output</td>
                  <td class="py-1 text-right font-mono text-gray-700">{{ sessionTotals.outputTokens.toLocaleString() }}</td>
                  <td class="py-1 text-right font-mono text-gray-700">${{ sessionTotals.outputCost.toFixed(5) }}</td>
                </tr>
                <tr>
                  <td class="py-1 text-purple-700">Cache Create <span class="text-xs text-gray-400">(5min)</span></td>
                  <td class="py-1 text-right font-mono text-gray-700">{{ sessionTotals.cacheCreateTokens.toLocaleString() }}</td>
                  <td class="py-1 text-right font-mono text-gray-700">${{ sessionTotals.cacheCreateCost.toFixed(5) }}</td>
                </tr>
                <tr>
                  <td class="py-1 text-teal-700">Cache Read <span class="text-xs text-gray-400">(5min)</span></td>
                  <td class="py-1 text-right font-mono text-gray-700">{{ sessionTotals.cacheReadTokens.toLocaleString() }}</td>
                  <td class="py-1 text-right font-mono text-gray-700">${{ sessionTotals.cacheReadCost.toFixed(5) }}</td>
                </tr>
                <tr class="border-t-2 border-gray-300 font-semibold">
                  <td class="pt-2 text-gray-900">Total</td>
                  <td></td>
                  <td class="pt-2 text-right font-mono text-emerald-600">${{ sessionTotals.total.toFixed(5) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Per-Message -->
          <div>
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Messages</h3>
            <div class="space-y-2">
              <div
                v-for="msg in messageDetails"
                :key="msg.id"
                class="border border-gray-200 rounded-lg overflow-hidden text-sm"
              >
                <!-- Message header — click to expand content -->
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition text-left"
                  @click="toggleExpand(msg.id)"
                >
                  <span :class="['px-2 py-0.5 rounded text-xs font-semibold shrink-0', roleBadgeClass(msg.role)]">
                    {{ roleLabel(msg.role) }}
                  </span>
                  <span v-if="msg.hasCompaction" class="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 shrink-0">compacted</span>
                  <span class="text-gray-600 truncate flex-1 text-xs">{{ msg.firstLine }}</span>
                  <span class="text-gray-400 text-xs shrink-0">{{ expandedMsgIds.has(msg.id) ? '▲' : '▼' }}</span>
                </button>

                <!-- Expanded content -->
                <div v-if="expandedMsgIds.has(msg.id)" class="px-3 py-2 border-t border-gray-100 bg-white">
                  <div v-if="msg.hasCompaction" class="mb-2 px-2 py-1.5 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                    Context compaction occurred — older messages were summarized to free up context window.
                  </div>
                  <pre class="text-xs text-gray-700 whitespace-pre-wrap break-words font-sans max-h-40 overflow-y-auto">{{ msg.fullContent }}</pre>
                </div>

                <!-- Token/cost table -->
                <div class="px-3 py-2 border-t border-gray-100">
                  <div class="text-xs text-gray-400 mb-1">This message:</div>
                  <table class="w-full text-xs table-fixed">
                    <colgroup><col class="w-1/2"><col class="w-1/4"><col class="w-1/4"></colgroup>
                    <thead>
                      <tr class="text-gray-400">
                        <th class="text-left font-medium pb-1">Type</th>
                        <th class="text-right font-medium pb-1">Tokens</th>
                        <th class="text-right font-medium pb-1">Cost</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                      <tr v-if="msg.inputTokens > 0">
                        <td class="py-0.5 text-blue-700">Input</td>
                        <td class="py-0.5 text-right font-mono text-gray-600">{{ msg.inputTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-600">${{ msg.input.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.outputTokens > 0">
                        <td class="py-0.5 text-amber-700">Output</td>
                        <td class="py-0.5 text-right font-mono text-gray-600">{{ msg.outputTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-600">${{ msg.output.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.cacheCreateTokens > 0">
                        <td class="py-0.5 text-purple-700">Cache Create <span class="text-gray-400">(5min)</span></td>
                        <td class="py-0.5 text-right font-mono text-gray-600">{{ msg.cacheCreateTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-600">${{ msg.cacheCreate.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.cacheReadTokens > 0">
                        <td class="py-0.5 text-teal-700">Cache Read <span class="text-gray-400">(5min)</span></td>
                        <td class="py-0.5 text-right font-mono text-gray-600">{{ msg.cacheReadTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-600">${{ msg.cacheRead.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.total > 0" class="font-semibold border-t border-gray-200">
                        <td class="pt-1 text-gray-700">Message total</td>
                        <td></td>
                        <td class="pt-1 text-right font-mono text-emerald-600">${{ msg.total.toFixed(5) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Running total -->
                <div v-if="msg.total > 0" class="px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <div class="text-xs text-gray-400 mb-1">Running total after this message</div>
                  <table class="w-full text-xs table-fixed">
                    <colgroup><col class="w-1/2"><col class="w-1/4"><col class="w-1/4"></colgroup>
                    <thead>
                      <tr class="text-gray-400">
                        <th class="text-left font-medium pb-1">Type</th>
                        <th class="text-right font-medium pb-1">Tokens</th>
                        <th class="text-right font-medium pb-1">Cost</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr v-if="msg.cumInputTokens > 0">
                        <td class="py-0.5 text-blue-700">Input</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">{{ msg.cumInputTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">${{ msg.cumInputCost.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.cumOutputTokens > 0">
                        <td class="py-0.5 text-amber-700">Output</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">{{ msg.cumOutputTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">${{ msg.cumOutputCost.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.cumCacheCreateTokens > 0">
                        <td class="py-0.5 text-purple-700">Cache Create</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">{{ msg.cumCacheCreateTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">${{ msg.cumCacheCreateCost.toFixed(5) }}</td>
                      </tr>
                      <tr v-if="msg.cumCacheReadTokens > 0">
                        <td class="py-0.5 text-teal-700">Cache Read</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">{{ msg.cumCacheReadTokens.toLocaleString() }}</td>
                        <td class="py-0.5 text-right font-mono text-gray-500">${{ msg.cumCacheReadCost.toFixed(5) }}</td>
                      </tr>
                      <tr class="font-semibold border-t border-gray-200">
                        <td class="pt-1 text-gray-700">Total</td>
                        <td></td>
                        <td class="pt-1 text-right font-mono text-emerald-600">${{ msg.cumTotal.toFixed(5) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pop-enter-active { transition: all 0.2s ease; }
.pop-leave-active { transition: all 0.15s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.85) translateY(4px); }

.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
