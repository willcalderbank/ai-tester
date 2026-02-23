<script setup lang="ts">
import { MODELS } from '~/composables/useChat'

const { model, reset, conversationStarted } = useChat()

const drawerOpen = ref(false)
</script>

<template>
  <header class="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 shadow-sm">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
      <!-- Logo -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <span class="text-white font-bold text-sm">AI</span>
        </div>
        <span class="font-semibold text-gray-900 text-sm hidden sm:block">AI Tester</span>
      </div>

      <!-- Desktop nav -->
      <div class="hidden md:flex items-center gap-4">
        <select
          v-model="model"
          class="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option v-for="m in MODELS" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
        <button
          @click="reset"
          class="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium"
        >
          New Chat
        </button>
      </div>

      <!-- Burger (mobile) -->
      <button
        class="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
        @click="drawerOpen = true"
        aria-label="Open menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </header>

  <!-- Drawer overlay -->
  <Transition name="fade">
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-40 bg-black/40"
      @click="drawerOpen = false"
    />
  </Transition>

  <!-- Drawer panel -->
  <Transition name="slide">
    <aside
      v-if="drawerOpen"
      class="fixed top-0 right-0 h-full w-64 z-50 bg-white shadow-xl flex flex-col p-6 gap-5"
    >
      <div class="flex items-center justify-between">
        <span class="font-semibold text-gray-900">Menu</span>
        <button @click="drawerOpen = false" class="p-1 rounded hover:bg-gray-100">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</label>
        <select
          v-model="model"
          class="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option v-for="m in MODELS" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>

      <div class="border-t border-gray-100 pt-3 flex-1 overflow-y-auto">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1">Conversations</p>
        <ConversationList @close="drawerOpen = false" />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
