<script setup lang="ts">
const { messages, isLoading } = useChat()

const messagesEnd = ref<HTMLDivElement | null>(null)

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
)
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <AppHeader />

    <!-- Content below fixed header -->
    <div class="flex flex-1 pt-14 overflow-hidden">
      <!-- Desktop sidebar -->
      <aside class="hidden md:flex flex-col w-64 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-3">
        <ConversationList />
      </aside>

      <!-- Main chat area -->
      <div class="flex flex-col flex-1 overflow-hidden">
      <PreambleEditor />

      <!-- Message list -->
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
              <p class="text-gray-600 font-medium">Start a conversation</p>
              <p class="text-gray-400 text-sm mt-1">Optionally set a system message above, then send your first message.</p>
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

      <ChatInput />
      </div>
    </div>

    <CostSummary />
  </div>
</template>
