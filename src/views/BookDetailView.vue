<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books'
import { useSessionsStore } from '@/stores/sessions'
import { useTagsStore } from '@/stores/tags'
import { useCompletionsStore } from '@/stores/completions'
import StarRating from '@/components/StarRating.vue'
import type { Book } from '@/types'
import { ChevronLeftIcon, TrashIcon, PencilIcon, CheckIcon, BookOpenIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const booksStore = useBooksStore()
const sessionsStore = useSessionsStore()
const tagsStore = useTagsStore()
const completionsStore = useCompletionsStore()

const book = ref<Book | null>(null)
const editing = ref(false)
const editNotes = ref('')
const editLocation = ref('')
const editTotalPages = ref<number | null>(null)
const pageInput = ref<number | null>(null)
const sessionNote = ref('')
const loading = ref(false)
const markingFinished = ref(false)

const sessions = computed(() => sessionsStore.sessionsByBook[book.value?.id ?? ''] ?? [])
const latestSession = computed(() => sessionsStore.getLatestSession(book.value?.id ?? ''))
const currentStatus = computed(() => latestSession.value?.status ?? null)
const bookTagIds = computed(() => tagsStore.getBookTagIds(book.value?.id ?? ''))
const bookCompletions = computed(() => completionsStore.getBookCompletions(book.value?.id ?? ''))

const statusMeta = computed(() => ({
  STARTED:  { label: t('bookDetail.statusStarted'),  icon: '📖', color: 'text-green-600' },
  PAUSED:   { label: t('bookDetail.statusPaused'),   icon: '⏸️', color: 'text-yellow-600' },
  FINISHED: { label: t('bookDetail.statusFinished'), icon: '✅', color: 'text-blue-600' },
}))

onMounted(async () => {
  book.value = await booksStore.getBookById(route.params.id as string)
  if (book.value) {
    await Promise.all([
      sessionsStore.fetchBookSessions(book.value.id),
      tagsStore.fetchTags(),
      tagsStore.fetchBookTags(book.value.id),
      completionsStore.fetchBookCompletions(book.value.id),
    ])
    editNotes.value = book.value.notes ?? ''
    editLocation.value = book.value.location ?? ''
    editTotalPages.value = book.value.total_pages ?? null
  }
})

async function updateRating(v: number | null) {
  if (!book.value) return
  await booksStore.updateBook(book.value.id, { my_rating: v })
  book.value.my_rating = v
}

async function saveEdit() {
  if (!book.value) return
  await booksStore.updateBook(book.value.id, {
    notes: editNotes.value,
    location: editLocation.value,
    total_pages: editTotalPages.value,
  })
  book.value.notes = editNotes.value
  book.value.location = editLocation.value
  book.value.total_pages = editTotalPages.value
  editing.value = false
}

async function toggleTag(tagId: string) {
  if (!book.value) return
  if (bookTagIds.value.includes(tagId)) {
    await tagsStore.removeTagFromBook(book.value.id, tagId)
  } else {
    await tagsStore.addTagToBook(book.value.id, tagId)
  }
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

async function markFinished() {
  if (!book.value) return
  markingFinished.value = true
  await completionsStore.markFinished(book.value.id)
  markingFinished.value = false
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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value === 'cs' ? 'cs-CZ' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
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
          <p class="text-white/60 text-xs">
            <span v-if="book.year">{{ book.year }}</span>
            <span v-if="book.year && book.total_pages"> · </span>
            <span v-if="book.total_pages">{{ t('bookDetail.pages', { n: book.total_pages }) }}</span>
          </p>
        </div>
      </div>
    </div>

    <div class="px-4 mt-12 space-y-4">
      <!-- My info card -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-700 dark:text-zinc-300">{{ t('bookDetail.myInfo') }}</h2>
          <button
            @click="editing ? saveEdit() : editing = true"
            :class="editing
              ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-700 text-white text-sm font-semibold shadow-sm active:opacity-80'
              : 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 text-sm font-semibold active:bg-brand-200'"
          >
            <CheckIcon v-if="editing" class="w-4 h-4" />
            <PencilIcon v-else class="w-4 h-4" />
            <span>{{ editing ? t('bookDetail.saveBtn') : t('bookDetail.editBtn') }}</span>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">{{ t('bookDetail.rating') }}</label>
            <div class="mt-1"><StarRating :model-value="book.my_rating" @update:model-value="updateRating" /></div>
          </div>
          <div>
            <label class="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">{{ t('bookDetail.location') }}</label>
            <input v-if="editing" v-model="editLocation" class="input mt-1" :placeholder="t('bookDetail.locationPlaceholder')" />
            <p v-else class="mt-1 text-gray-700 dark:text-zinc-300">{{ book.location || '—' }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">{{ t('bookDetail.totalPages') }}</label>
            <input v-if="editing" v-model.number="editTotalPages" type="number" min="1" class="input mt-1" :placeholder="t('bookDetail.totalPagesPlaceholder')" />
            <p v-else class="mt-1 text-gray-700 dark:text-zinc-300">{{ book.total_pages ?? '—' }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">{{ t('bookDetail.notes') }}</label>
            <textarea v-if="editing" v-model="editNotes" class="input mt-1 h-20 resize-none" :placeholder="t('bookDetail.notesPlaceholder')" />
            <p v-else class="mt-1 text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{{ book.notes || '—' }}</p>
          </div>
          <!-- Tags -->
          <div>
            <label class="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">{{ t('bookDetail.tags') }}</label>
            <div class="mt-2 flex flex-wrap gap-2">
              <template v-if="editing">
                <button
                  v-for="tag in tagsStore.tags"
                  :key="tag.id"
                  type="button"
                  @click="toggleTag(tag.id)"
                  :class="['px-3 py-1 rounded-full text-sm transition-colors',
                    bookTagIds.includes(tag.id)
                      ? 'bg-brand-700 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600']"
                >
                  {{ tag.name }}
                </button>
              </template>
              <template v-else>
                <span
                  v-for="tagId in bookTagIds"
                  :key="tagId"
                  class="px-3 py-1 rounded-full text-sm bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
                >
                  {{ tagsStore.getTagById(tagId)?.name }}
                </span>
                <span v-if="bookTagIds.length === 0" class="text-gray-400 dark:text-zinc-500 text-sm">—</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Mark as finished -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="font-semibold text-gray-700 dark:text-zinc-300">{{ t('bookDetail.finishHistory') }}</h2>
            <p class="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{{ t('bookDetail.markFinishedHint') }}</p>
          </div>
          <button
            @click="markFinished"
            :disabled="markingFinished"
            class="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <BookOpenIcon class="w-4 h-4" />
            {{ t('bookDetail.markFinished') }}
          </button>
        </div>
        <div v-if="bookCompletions.length" class="mt-2 space-y-1.5">
          <div
            v-for="(c, i) in bookCompletions"
            :key="c.id"
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400"
          >
            <span class="text-brand-600 font-medium min-w-[1.25rem] text-center">{{ bookCompletions.length - i }}.</span>
            <span>{{ formatDateShort(c.finished_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Log reading session -->
      <div class="card">
        <h2 class="font-semibold text-gray-700 dark:text-zinc-300 mb-3">{{ t('bookDetail.logReading') }}</h2>
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

      <!-- Reading history -->
      <div v-if="sessions.length" class="card">
        <h2 class="font-semibold text-gray-700 dark:text-zinc-300 mb-3">{{ t('bookDetail.readingHistory') }}</h2>
        <div class="space-y-3">
          <div v-for="s in sessions" :key="s.id" class="flex items-start gap-3">
            <span class="text-lg">{{ statusMeta[s.status].icon }}</span>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm font-medium', statusMeta[s.status].color]">{{ statusMeta[s.status].label }}</p>
              <p class="text-xs text-gray-400 dark:text-zinc-500">
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
