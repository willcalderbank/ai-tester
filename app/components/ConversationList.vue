<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

const { conversations, fetchConversations, loadConversation, deleteConversation, conversationId } = useConversations()
const { reset } = useChat()

const emit = defineEmits<{ close: [] }>()

onMounted(fetchConversations)

// Re-fetch when a new conversation is saved (conversationId changes from null → id)
watch(conversationId, (newId, oldId) => {
  if (newId && newId !== oldId) fetchConversations()
})

function formatDate(ts: Timestamp | null): string {
  if (!ts) return ''
  try {
    return formatDistanceToNow(ts.toDate(), { addSuffix: true })
  } catch {
    return ''
  }
}

async function handleLoad(id: string) {
  await loadConversation(id)
  emit('close')
}

async function handleDelete(id: string) {
  if (!confirm('Delete this conversation?')) return
  await deleteConversation(id)
}

function handleNew() {
  reset()
  emit('close')
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <button
      @click="handleNew"
      class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Chat
    </button>

    <div v-if="conversations.length === 0" class="px-3 py-4 text-xs text-gray-400 text-center">
      No conversations yet
    </div>

    <div
      v-for="conv in conversations"
      :key="conv.id"
      class="group flex items-start justify-between gap-2 w-full px-3 py-2 text-left rounded-md transition-colors hover:bg-gray-100 cursor-pointer"
      :class="conv.id === conversationId ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'"
      @click="handleLoad(conv.id)"
    >
      <div class="flex flex-col min-w-0">
        <span class="text-sm font-medium truncate">{{ conv.title }}</span>
        <span class="text-xs text-gray-400">{{ formatDate(conv.updatedAt) }}</span>
      </div>
      <button
        class="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
        @click.stop="handleDelete(conv.id)"
        aria-label="Delete conversation"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>
