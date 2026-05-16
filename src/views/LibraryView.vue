<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books'
import { useTagsStore } from '@/stores/tags'
import type { Tag } from '@/types'
import BookCard from '@/components/BookCard.vue'
import { MagnifyingGlassIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const { t } = useI18n()
const booksStore = useBooksStore()
const tagsStore = useTagsStore()
const search = ref('')
const activeTagId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const filtered = computed(() => {
  let list = booksStore.searchBooks(search.value)
  if (activeTagId.value) {
    list = list.filter(b => tagsStore.getBookTagIds(b.id).includes(activeTagId.value!))
  }
  return list
})

onMounted(async () => {
  await Promise.all([
    booksStore.fetchBooks(),
    tagsStore.fetchTags(),
  ])
  await tagsStore.fetchAllBookTags()
  if (route.query.tag) activeTagId.value = String(route.query.tag)
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
    [b.title, b.author, b.year, b.isbn, b.total_pages, b.location, b.my_rating, b.notes]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(';')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bookmark-export-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

function getBookTags(bookId: string): Tag[] {
  return tagsStore.getBookTagIds(bookId)
    .map(id => tagsStore.getTagById(id))
    .filter((t): t is Tag => Boolean(t))
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
      <h1 class="text-2xl font-bold text-brand-900 dark:text-brand-200">{{ t('library.title') }}</h1>
      <div class="flex gap-2">
        <button @click="exportJson" title="Export JSON" class="p-2 text-gray-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">
          <ArrowDownTrayIcon class="w-5 h-5" />
        </button>
        <button @click="exportCsv" title="Export CSV" class="p-2 text-gray-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400 text-xs font-bold">CSV</button>
        <button @click="fileInput?.click()" title="Import JSON" class="p-2 text-gray-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">
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
        @click="activeTagId = null"
        :class="['px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          activeTagId === null
            ? 'bg-brand-800 text-white dark:bg-brand-700'
            : 'bg-white text-gray-600 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700']"
      >
        {{ t('library.filterAll') }}
      </button>
      <button
        v-for="tag in tagsStore.tags"
        :key="tag.id"
        @click="activeTagId = tag.id"
        :class="['px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          activeTagId === tag.id
            ? 'bg-brand-800 text-white dark:bg-brand-700'
            : 'bg-white text-gray-600 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700']"
      >
        {{ tag.name }}
      </button>
    </div>

    <div v-if="booksStore.loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="!filtered.length" class="text-center py-12 text-gray-400 dark:text-zinc-500">
      <p class="text-4xl mb-3">🔍</p>
      <p>{{ t('library.nothingFound') }}</p>
    </div>

    <div v-else class="flex flex-col gap-3">
      <BookCard
        v-for="book in filtered"
        :key="book.id"
        :book="book"
        :tags="getBookTags(book.id)"
      />
    </div>
  </div>
</template>
