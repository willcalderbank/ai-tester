<script setup lang="ts">
const { totalCost, messages } = useChat()

const formatted = computed(() => {
  if (totalCost.value < 0.0001 && messages.value.length === 0) return null
  if (totalCost.value < 0.0001) return '< $0.0001'
  return `$${totalCost.value.toFixed(4)}`
})
</script>

<template>
  <Transition name="pop">
    <div
      v-if="formatted"
      class="fixed bottom-20 right-4 z-30 bg-white border border-gray-200 shadow-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700"
    >
      <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
      Total: <span class="text-emerald-600 font-semibold">{{ formatted }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.pop-enter-active { transition: all 0.2s ease; }
.pop-leave-active { transition: all 0.15s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.85) translateY(4px); }
</style>
