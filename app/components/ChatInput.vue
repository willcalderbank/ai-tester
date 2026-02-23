<script setup lang="ts">
const { sendMessage, isLoading } = useChat()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

async function submit() {
  const text = input.value.trim()
  if (!text || isLoading.value) return
  input.value = ''
  await nextTick()
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
  await sendMessage(text)
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}
</script>

<template>
  <div class="border-t border-gray-200 bg-white px-4 py-3">
    <div class="max-w-5xl mx-auto flex items-end gap-3">
      <textarea
        ref="textareaRef"
        v-model="input"
        :disabled="isLoading"
        rows="1"
        placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
        class="flex-1 text-sm rounded-xl border border-gray-300 px-4 py-2.5 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        :disabled="isLoading || !input.trim()"
        @click="submit"
        class="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label="Send"
      >
        <!-- Spinner -->
        <svg v-if="isLoading" class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
        </svg>
        <!-- Send icon -->
        <svg v-else class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
