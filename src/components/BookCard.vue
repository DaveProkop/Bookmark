<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Book, ReadingSession } from '@/types'
import StarRating from './StarRating.vue'

const props = defineProps<{ book: Book; lastSession?: ReadingSession | null }>()
const router = useRouter()
const { t } = useI18n()

const statusLabel = computed(() => {
  switch (props.lastSession?.status) {
    case 'STARTED':  return { text: t('bookCard.statusReading'),  color: 'bg-green-100 text-green-700' }
    case 'PAUSED':   return { text: t('bookCard.statusPaused'),   color: 'bg-yellow-100 text-yellow-700' }
    case 'FINISHED': return { text: t('bookCard.statusFinished'), color: 'bg-blue-100 text-blue-700' }
    default: return null
  }
})
</script>

<template>
  <div class="card flex gap-3 active:bg-gray-50 cursor-pointer" @click="router.push({ name: 'book', params: { id: book.id } })">
    <img
      v-if="book.cover_url"
      :src="book.cover_url"
      :alt="book.title"
      class="w-14 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
    />
    <div v-else class="w-14 h-20 bg-brand-100 rounded-lg flex-shrink-0 flex items-center justify-center">
      <span class="text-brand-500 text-2xl">📚</span>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-semibold text-gray-900 leading-tight line-clamp-2">{{ book.title }}</h3>
        <span v-if="statusLabel" :class="['text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', statusLabel.color]">
          {{ statusLabel.text }}
        </span>
      </div>
      <p v-if="book.author" class="text-sm text-gray-500 mt-0.5">{{ book.author }}</p>
      <div class="flex items-center gap-2 mt-1">
        <StarRating :model-value="book.my_rating" readonly />
        <span v-if="book.location" class="text-xs text-gray-400">📍 {{ book.location }}</span>
      </div>
    </div>
  </div>
</template>
