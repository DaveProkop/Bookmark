<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import { useBooksStore } from '@/stores/books'
import { lookupBook } from '@/lib/bookApi'
import type { BookLookupResult } from '@/types'
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const { t } = useI18n()
const booksStore = useBooksStore()

const state = ref<'scanning' | 'loading' | 'found' | 'new' | 'not-found'>('scanning')
const lookupResult = ref<BookLookupResult | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

async function onDetected(isbn: string) {
  state.value = 'loading'

  const existing = await booksStore.getBookByIsbn(isbn)
  if (existing) {
    router.push({ name: 'book', params: { id: existing.id } })
    return
  }

  const result = await lookupBook(isbn)
  if (result) {
    lookupResult.value = result
    state.value = 'new'
  } else {
    lookupResult.value = { isbn, title: '', author: null, year: null, total_pages: null, cover_url: null, description: null, external_rating: null, external_rating_count: null }
    state.value = 'not-found'
  }
}

async function saveBook() {
  if (!lookupResult.value) return
  saving.value = true
  saveError.value = null
  const book = await booksStore.addBook({
    isbn: lookupResult.value.isbn,
    title: lookupResult.value.title,
    author: lookupResult.value.author,
    year: lookupResult.value.year,
    total_pages: lookupResult.value.total_pages,
    cover_url: lookupResult.value.cover_url,
    location: null,
    my_rating: null,
    notes: null,
  })
  saving.value = false
  if (book) router.push({ name: 'book', params: { id: book.id } })
  else saveError.value = booksStore.error ?? t('addBook.saveError')
}

function reset() {
  state.value = 'scanning'
  lookupResult.value = null
}
</script>

<template>
  <div class="fixed inset-0 bg-black flex flex-col">
    <div class="absolute top-0 inset-x-0 z-10 flex items-center gap-3 p-4 bg-gradient-to-b from-black/60 to-transparent">
      <button @click="router.back()" class="text-white p-1">
        <ChevronLeftIcon class="w-6 h-6" />
      </button>
      <h1 class="text-white font-semibold">{{ t('scan.title') }}</h1>
    </div>

    <BarcodeScanner v-if="state === 'scanning'" @detected="onDetected" class="flex-1" />

    <div v-if="state === 'loading'" class="flex-1 flex items-center justify-center">
      <div class="text-center text-white">
        <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>{{ t('scan.searching') }}</p>
      </div>
    </div>

    <div v-if="state === 'new' && lookupResult" class="flex-1 bg-brand-50 dark:bg-zinc-900 overflow-y-auto p-4 pt-16">
      <h2 class="text-lg font-bold text-brand-900 dark:text-brand-200 mb-4">{{ t('scan.bookFound') }}</h2>
      <div class="card flex gap-4 mb-4">
        <img v-if="lookupResult.cover_url" :src="lookupResult.cover_url" class="w-20 h-28 object-cover rounded-lg" />
        <div v-else class="w-20 h-28 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center text-3xl">📚</div>
        <div class="flex-1">
          <p class="font-bold text-gray-900 dark:text-zinc-100">{{ lookupResult.title }}</p>
          <p class="text-gray-500 dark:text-zinc-400 text-sm">{{ lookupResult.author }}</p>
          <p class="text-gray-400 dark:text-zinc-500 text-sm">{{ lookupResult.year }}</p>
          <p v-if="lookupResult.external_rating" class="text-sm text-brand-600 dark:text-brand-400 mt-1">
            ⭐ {{ lookupResult.external_rating }}/5 ({{ lookupResult.external_rating_count }} {{ t('scan.ratings') }})
          </p>
        </div>
      </div>
      <p v-if="lookupResult.description" class="text-gray-600 dark:text-zinc-400 text-sm mb-4 line-clamp-4">{{ lookupResult.description }}</p>
      <div v-if="saveError" class="text-red-700 dark:text-red-400 text-sm bg-red-100 dark:bg-red-950/50 rounded-xl p-3 mb-3">{{ saveError }}</div>
      <div class="flex gap-3">
        <button @click="saveBook" :disabled="saving" class="btn-primary flex-1">
          {{ saving ? t('scan.saving') : t('scan.addToLibrary') }}
        </button>
        <button @click="reset" class="btn-secondary">{{ t('scan.cancel') }}</button>
      </div>
    </div>

    <div v-if="state === 'not-found'" class="flex-1 bg-brand-50 dark:bg-zinc-900 flex items-center justify-center p-6 pt-16">
      <div class="text-center">
        <p class="text-5xl mb-4">🤷</p>
        <p class="font-semibold text-gray-800 dark:text-zinc-100 mb-2">{{ t('scan.notFound') }}</p>
        <p class="text-gray-500 dark:text-zinc-400 text-sm mb-6">ISBN: {{ lookupResult?.isbn }}</p>
        <div class="flex gap-3 justify-center">
          <button @click="reset" class="btn-secondary">{{ t('scan.tryAgain') }}</button>
          <button @click="router.push({ name: 'add', query: { isbn: lookupResult?.isbn } })" class="btn-primary">
            {{ t('scan.addManually') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
