<script setup lang="ts">
const { sendMessage, isLoading } = useChat()
const { uploadImage } = useImageUpload()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingImage = ref<{ file: File; preview: string } | null>(null)
const uploading = ref(false)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

async function submit() {
  const text = input.value.trim()
  if ((!text && !pendingImage.value) || isLoading.value || uploading.value) return

  let imageUrl: string | undefined
  if (pendingImage.value) {
    uploading.value = true
    try {
      imageUrl = await uploadImage(pendingImage.value.file)
    } finally {
      uploading.value = false
    }
    clearImage()
  }

  input.value = ''
  await nextTick()
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
  await sendMessage(text, imageUrl)
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const preview = URL.createObjectURL(file)
  if (pendingImage.value) URL.revokeObjectURL(pendingImage.value.preview)
  pendingImage.value = { file, preview }
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function clearImage() {
  if (pendingImage.value) URL.revokeObjectURL(pendingImage.value.preview)
  pendingImage.value = null
}

const busy = computed(() => isLoading.value || uploading.value)
</script>

<template>
  <div class="border-t border-gray-200 bg-white px-4 py-3">
    <div class="max-w-5xl mx-auto flex flex-col gap-2">
      <!-- Image preview -->
      <div v-if="pendingImage" class="relative w-20 h-20">
        <img :src="pendingImage.preview" class="w-20 h-20 object-cover rounded-lg border border-gray-200" />
        <button
          @click="clearImage"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          aria-label="Remove image"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div v-if="uploading" class="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
          <svg class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
          </svg>
        </div>
      </div>

      <div class="flex items-end gap-2">
        <!-- Image attach button -->
        <button
          :disabled="busy"
          @click="fileInputRef?.click()"
          class="shrink-0 w-10 h-10 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Attach image"
        >
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />

        <textarea
          ref="textareaRef"
          v-model="input"
          :disabled="busy"
          rows="1"
          :placeholder="pendingImage ? 'Add a message… (optional)' : 'Send a message… (Enter to send, Shift+Enter for newline)'"
          class="flex-1 text-sm rounded-xl border border-gray-300 px-4 py-2.5 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          @keydown="handleKeydown"
          @input="autoResize"
        />

        <button
          :disabled="busy || (!input.trim() && !pendingImage)"
          @click="submit"
          class="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Send"
        >
          <svg v-if="busy" class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
          </svg>
          <svg v-else class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
