<script setup lang="ts">
import type { ChatMessage } from '~/composables/useChat'

const props = defineProps<{ message: ChatMessage }>()

const isUser = computed(() => props.message.role === 'user')

const formattedCost = computed(() => {
  if (props.message.cost == null) return null
  if (props.message.cost < 0.0001) return '< $0.0001'
  return `$${props.message.cost.toFixed(4)}`
})
</script>

<template>
  <div :class="['flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row']">
    <!-- Avatar -->
    <div
      :class="[
        'w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold',
        isUser ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700',
      ]"
    >
      {{ isUser ? 'You' : 'AI' }}
    </div>

    <!-- Bubble + meta -->
    <div :class="['flex flex-col gap-1 max-w-[75%]', isUser ? 'items-end' : 'items-start']">
      <img
        v-if="message.imageUrl"
        :src="message.imageUrl"
        class="max-w-xs rounded-xl border border-gray-200 object-cover"
      />
      <div
        v-if="message.content"
        :class="[
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm',
        ]"
      >{{ message.content }}</div>

      <!-- Metadata row -->
      <div class="flex items-center gap-3 text-[11px] text-gray-400 px-1">
        <span v-if="message.inputTokens != null">↑ {{ message.inputTokens.toLocaleString() }} in</span>
        <span v-if="message.outputTokens != null">↓ {{ message.outputTokens.toLocaleString() }} out</span>
        <span v-if="formattedCost" class="text-emerald-600 font-medium">{{ formattedCost }}</span>
        <span v-if="message.model" class="text-gray-300">{{ message.model }}</span>
      </div>
    </div>
  </div>
</template>
