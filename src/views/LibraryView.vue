<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books'
import { useSessionsStore } from '@/stores/sessions'
import BookCard from '@/components/BookCard.vue'
import { MagnifyingGlassIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
const booksStore = useBooksStore()
const sessionsStore = useSessionsStore()
const search = ref('')
const filter = ref<'all' | 'reading' | 'finished' | 'new'>('all')
const fileInput = ref<HTMLInputElement>()

const filtered = computed(() => {
  let list = booksStore.searchBooks(search.value)
  if (filter.value === 'reading') list = list.filter(b => ['STARTED', 'PAUSED'].includes(sessionsStore.getBookStatus(b.id) ?? ''))
  if (filter.value === 'finished') list = list.filter(b => sessionsStore.getBookStatus(b.id) === 'FINISHED')
  if (filter.value === 'new') list = list.filter(b => !sessionsStore.getBookStatus(b.id))
  return list
})

const filterLabels = computed(() => [
  { key: 'all',      label: t('library.filterAll') },
  { key: 'reading',  label: t('library.filterReading') },
  { key: 'finished', label: t('library.filterFinished') },
  { key: 'new',      label: t('library.filterNew') },
] as const)

onMounted(async () => {
  await booksStore.fetchBooks()
  for (const book of booksStore.books) {
    await sessionsStore.fetchBookSessions(book.id)
  }
})

function exportJson() {
  const blob = new Blob([booksStore.exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bookmark-export-${new Date().toISOString().slice(0,10)}.json`
  a.click()
}

function exportCsv() {
  const header = t('library.csvHeader')
  const rows = booksStore.books.map(b =>
    [b.title, b.author, b.year, b.isbn, b.location, b.my_rating, b.notes]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(';')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bookmark-export-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

async function importFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  const { added, skipped } = await booksStore.importJson(text)
  alert(t('library.importDone', { added, skipped }))
}
</script>

<template>
  <div class="p-4">
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-brand-900">{{ t('library.title') }}</h1>
      <div class="flex gap-2">
        <button @click="exportJson" title="Export JSON" class="p-2 text-gray-500 hover:text-brand-700">
          <ArrowDownTrayIcon class="w-5 h-5" />
        </button>
        <button @click="exportCsv" title="Export CSV" class="p-2 text-gray-500 hover:text-brand-700 text-xs font-bold">CSV</button>
        <button @click="fileInput?.click()" title="Import JSON" class="p-2 text-gray-500 hover:text-brand-700">
          <ArrowUpTrayIcon class="w-5 h-5" />
        </button>
        <input ref="fileInput" type="file" accept=".json" class="hidden" @change="importFile" />
      </div>
    </header>

    <div class="relative mb-3">
      <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input v-model="search" type="search" :placeholder="t('library.searchPlaceholder')" class="input pl-10" />
    </div>

    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button
        v-for="f in filterLabels"
        :key="f.key"
        @click="filter = f.key"
        :class="['px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          filter === f.key ? 'bg-brand-800 text-white' : 'bg-white text-gray-600 border border-gray-200']"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="booksStore.loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="!filtered.length" class="text-center py-12 text-gray-400">
      <p class="text-4xl mb-3">🔍</p>
      <p>{{ t('library.nothingFound') }}</p>
    </div>

    <div v-else class="flex flex-col gap-3">
      <BookCard
        v-for="book in filtered"
        :key="book.id"
        :book="book"
        :last-session="sessionsStore.getLatestSession(book.id)"
      />
    </div>
  </div>
</template>
