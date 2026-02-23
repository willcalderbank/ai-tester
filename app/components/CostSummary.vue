<script setup lang="ts">
import { computed } from 'vue'
import { MODELS } from '../composables/useChat'

const { messages, model } = useChat()

const costs = computed(() => {
  let inputCost = 0
  let outputCost = 0

  for (const msg of messages.value) {
    if (msg.inputTokens) {
      const modelData = MODELS.find((m) => m.id === (msg.model || model.value))
      if (modelData) {
        inputCost += (msg.inputTokens / 1_000_000) * modelData.inputPer1M
      }
    }
    if (msg.outputTokens) {
      const modelData = MODELS.find((m) => m.id === (msg.model || model.value))
      if (modelData) {
        outputCost += (msg.outputTokens / 1_000_000) * modelData.outputPer1M
      }
    }
  }

  return { inputCost, outputCost, total: inputCost + outputCost }
})

const showCosts = computed(() => {
  return messages.value.length > 0 && costs.value.total > 0
})
</script>

<template>
  <Transition name="pop">
    <div
      v-if="showCosts"
      class="fixed bottom-20 right-4 z-30 bg-white border border-gray-200 shadow-md rounded-lg px-3 py-2 text-xs font-medium text-gray-700 space-y-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-gray-500">In:</span>
        <span class="text-blue-600 font-semibold">${{ costs.inputCost.toFixed(4) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">Out:</span>
        <span class="text-orange-600 font-semibold">${{ costs.outputCost.toFixed(4) }}</span>
      </div>
      <div class="border-t border-gray-200 pt-1 flex items-center gap-2">
        <span class="text-gray-500">Total:</span>
        <span class="text-emerald-600 font-semibold">${{ costs.total.toFixed(4) }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pop-enter-active { transition: all 0.2s ease; }
.pop-leave-active { transition: all 0.15s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.85) translateY(4px); }
</style>
