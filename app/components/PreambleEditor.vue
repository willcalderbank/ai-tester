<script setup lang="ts">
const { preamble, conversationStarted } = useChat()
</script>

<template>
  <div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
    <div class="max-w-5xl mx-auto">
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        System Message (Preamble)
        <span v-if="conversationStarted" class="ml-2 normal-case font-normal text-amber-600">— locked during conversation</span>
      </label>
      <textarea
        v-model="preamble"
        :disabled="conversationStarted"
        rows="2"
        placeholder="Optional: set a system prompt before your first message…"
        class="w-full text-sm rounded-md border border-gray-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  </div>
</template>
