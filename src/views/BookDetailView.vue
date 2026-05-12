<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books'
import { useSessionsStore } from '@/stores/sessions'
import StarRating from '@/components/StarRating.vue'
import type { Book } from '@/types'
import { ChevronLeftIcon, TrashIcon, PencilIcon, CheckIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const booksStore = useBooksStore()
const sessionsStore = useSessionsStore()

const book = ref<Book | null>(null)
const editing = ref(false)
const editNotes = ref('')
const editLocation = ref('')
const pageInput = ref<number | null>(null)
const sessionNote = ref('')
const loading = ref(false)

const sessions = computed(() => sessionsStore.sessionsByBook[book.value?.id ?? ''] ?? [])
const latestSession = computed(() => sessionsStore.getLatestSession(book.value?.id ?? ''))
const currentStatus = computed(() => latestSession.value?.status ?? null)

const statusMeta = computed(() => ({
  STARTED:  { label: t('bookDetail.statusStarted'),  icon: '📖', color: 'text-green-600' },
  PAUSED:   { label: t('bookDetail.statusPaused'),   icon: '⏸️', color: 'text-yellow-600' },
  FINISHED: { label: t('bookDetail.statusFinished'), icon: '✅', color: 'text-blue-600' },
}))

onMounted(async () => {
  book.value = await booksStore.getBookById(route.params.id as string)
  if (book.value) {
    await sessionsStore.fetchBookSessions(book.value.id)
    editNotes.value = book.value.notes ?? ''
    editLocation.value = book.value.location ?? ''
  }
})

async function updateRating(v: number | null) {
  if (!book.value) return
  await booksStore.updateBook(book.value.id, { my_rating: v })
  book.value.my_rating = v
}

async function saveEdit() {
  if (!book.value) return
  await booksStore.updateBook(book.value.id, { notes: editNotes.value, location: editLocation.value })
  book.value.notes = editNotes.value
  book.value.location = editLocation.value
  editing.value = false
}

async function logSession(status: 'STARTED' | 'PAUSED' | 'FINISHED') {
  if (!book.value) return
  loading.value = true
  await sessionsStore.addSession({
    book_id: book.value.id,
    status,
    page_number: pageInput.value,
    notes: sessionNote.value || null,
  })
  pageInput.value = null
  sessionNote.value = ''
  loading.value = false
}

async function deleteBook() {
  if (!book.value || !confirm(t('bookDetail.confirmDelete'))) return
  await booksStore.deleteBook(book.value.id)
  router.back()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(locale.value === 'cs' ? 'cs-CZ' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div v-if="book" class="pb-6">
    <div class="relative">
      <div class="h-48 bg-gradient-to-b from-brand-800 to-brand-600 flex items-end p-4 gap-4">
        <button @click="router.back()" class="absolute top-4 left-4 p-2 text-white/80">
          <ChevronLeftIcon class="w-6 h-6" />
        </button>
        <button @click="deleteBook" class="absolute top-4 right-4 p-2 text-white/60">
          <TrashIcon class="w-5 h-5" />
        </button>
        <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title"
          class="w-24 h-36 object-cover rounded-xl shadow-lg -mb-8 border-2 border-white" />
        <div v-else class="w-24 h-36 bg-brand-100 rounded-xl shadow-lg -mb-8 border-2 border-white flex items-center justify-center text-4xl">📚</div>
        <div class="text-white pb-2">
          <h1 class="text-xl font-bold leading-tight line-clamp-2">{{ book.title }}</h1>
          <p v-if="book.author" class="text-white/80 text-sm">{{ book.author }}</p>
          <p v-if="book.year" class="text-white/60 text-xs">{{ book.year }}</p>
        </div>
      </div>
    </div>

    <div class="px-4 mt-12 space-y-4">
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-700">{{ t('bookDetail.myInfo') }}</h2>
          <button @click="editing ? saveEdit() : editing = true" class="p-1.5 text-brand-700">
            <CheckIcon v-if="editing" class="w-5 h-5" />
            <PencilIcon v-else class="w-5 h-5" />
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wide">{{ t('bookDetail.rating') }}</label>
            <div class="mt-1"><StarRating :model-value="book.my_rating" @update:model-value="updateRating" /></div>
          </div>
          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wide">{{ t('bookDetail.location') }}</label>
            <input v-if="editing" v-model="editLocation" class="input mt-1" :placeholder="t('bookDetail.locationPlaceholder')" />
            <p v-else class="mt-1 text-gray-700">{{ book.location || '—' }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wide">{{ t('bookDetail.notes') }}</label>
            <textarea v-if="editing" v-model="editNotes" class="input mt-1 h-20 resize-none" :placeholder="t('bookDetail.notesPlaceholder')" />
            <p v-else class="mt-1 text-gray-700 whitespace-pre-wrap">{{ book.notes || '—' }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="font-semibold text-gray-700 mb-3">{{ t('bookDetail.logReading') }}</h2>
        <div class="flex gap-2 mb-3">
          <input v-model.number="pageInput" type="number" :placeholder="t('bookDetail.pagePlaceholder')" class="input flex-1" min="1" />
        </div>
        <div class="flex gap-2 flex-wrap">
          <button @click="logSession('STARTED')" :disabled="loading || currentStatus === 'STARTED'" class="btn-secondary flex-1 text-sm">
            📖 {{ t('bookDetail.start') }}
          </button>
          <button @click="logSession('PAUSED')" :disabled="loading || !currentStatus || currentStatus === 'FINISHED'" class="btn-secondary flex-1 text-sm">
            ⏸️ {{ t('bookDetail.pause') }}
          </button>
          <button @click="logSession('FINISHED')" :disabled="loading || currentStatus === 'FINISHED'" class="btn-primary flex-1 text-sm">
            ✅ {{ t('bookDetail.finish') }}
          </button>
        </div>
      </div>

      <div v-if="sessions.length" class="card">
        <h2 class="font-semibold text-gray-700 mb-3">{{ t('bookDetail.readingHistory') }}</h2>
        <div class="space-y-3">
          <div v-for="s in sessions" :key="s.id" class="flex items-start gap-3">
            <span class="text-lg">{{ statusMeta[s.status].icon }}</span>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm font-medium', statusMeta[s.status].color]">{{ statusMeta[s.status].label }}</p>
              <p class="text-xs text-gray-400">
                {{ formatDate(s.timestamp) }}<span v-if="s.page_number"> · {{ t('bookDetail.page', { n: s.page_number }) }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex justify-center items-center h-screen">
    <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
</template>
