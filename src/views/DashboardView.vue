<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useBooksStore } from '@/stores/books'
import { useSessionsStore } from '@/stores/sessions'
import { useTagsStore } from '@/stores/tags'
import { useCompletionsStore } from '@/stores/completions'
import BookCard from '@/components/BookCard.vue'
import { ArrowRightOnRectangleIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import { installPromptEvent, isInstalled } from '@/lib/pwaInstall'

const router = useRouter()
const { t, locale } = useI18n()
const booksStore = useBooksStore()
const sessionsStore = useSessionsStore()
const tagsStore = useTagsStore()
const completionsStore = useCompletionsStore()
const userName = ref('')

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

const activeBooks = computed(() =>
  booksStore.books.filter(b => {
    const status = sessionsStore.getBookStatus(b.id)
    return status === 'STARTED' || status === 'PAUSED'
  })
)

const recentBooks = computed(() =>
  booksStore.books.filter(b => {
    const status = sessionsStore.getBookStatus(b.id)
    return !status
  }).slice(0, 5)
)

const todayLabel = computed(() =>
  new Date().toLocaleDateString(locale.value === 'cs' ? 'cs-CZ' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
)

const tagsWithCount = computed(() =>
  tagsStore.tags.map(tag => ({
    tag,
    count: Object.values(tagsStore.bookTagIds).filter(ids => ids.includes(tag.id)).length,
  }))
)

const completionsThisYear = computed(() => completionsStore.getCompletionsByYear(currentYear))
const completionsThisMonth = computed(() => completionsStore.getCompletionsByMonth(currentYear, currentMonth))

const pagesThisYear = computed(() =>
  completionsThisYear.value.reduce((sum, c) => {
    const book = booksStore.books.find(b => b.id === c.book_id)
    return sum + (book?.total_pages ?? 0)
  }, 0)
)

const pagesThisMonth = computed(() =>
  completionsThisMonth.value.reduce((sum, c) => {
    const book = booksStore.books.find(b => b.id === c.book_id)
    return sum + (book?.total_pages ?? 0)
  }, 0)
)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userName.value = user?.email?.split('@')[0] ?? ''
  await Promise.all([
    booksStore.fetchBooks(),
    tagsStore.fetchTags(),
    completionsStore.fetchAllCompletions(),
  ])
  await tagsStore.fetchAllBookTags()
  for (const book of booksStore.books.slice(0, 20)) {
    await sessionsStore.fetchBookSessions(book.id)
  }
})

function goToTag(tagId: string) {
  router.push({ name: 'library', query: { tag: tagId } })
}

async function logout() {
  await supabase.auth.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="p-4">
    <header class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-brand-900">{{ t('dashboard.greeting', { name: userName }) }}</h1>
        <p class="text-gray-500 text-sm">{{ todayLabel }}</p>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="!isInstalled && installPromptEvent"
          @click="installPromptEvent?.prompt()"
          class="p-2 text-brand-600 hover:text-brand-800"
          :title="t('install.title')"
        >
          <ArrowDownTrayIcon class="w-6 h-6" />
        </button>
        <button @click="logout" class="p-2 text-gray-400 hover:text-gray-600">
          <ArrowRightOnRectangleIcon class="w-6 h-6" />
        </button>
      </div>
    </header>

    <div v-if="booksStore.loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Tags -->
      <section v-if="tagsWithCount.length" class="mb-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-3">{{ t('dashboard.tags') }}</h2>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="{ tag, count } in tagsWithCount"
            :key="tag.id"
            @click="goToTag(tag.id)"
            class="flex-shrink-0 flex flex-col items-center px-4 py-3 bg-white rounded-2xl border border-gray-200 shadow-sm active:bg-brand-50 transition-colors min-w-[80px]"
          >
            <span class="text-2xl font-bold text-brand-800">{{ count }}</span>
            <span class="text-xs text-gray-500 mt-0.5 text-center leading-tight">{{ tag.name }}</span>
          </button>
        </div>
      </section>

      <!-- Statistics -->
      <section v-if="completionsStore.allCompletions.length" class="mb-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-3">{{ t('stats.title') }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-brand-50 rounded-2xl p-4">
            <p class="text-xs text-brand-600 font-medium mb-1">{{ t('stats.booksMonth') }}</p>
            <p class="text-3xl font-bold text-brand-800">{{ completionsThisMonth.length }}</p>
            <p v-if="pagesThisMonth > 0" class="text-xs text-brand-500 mt-0.5">{{ t('stats.pages', { n: pagesThisMonth }) }}</p>
          </div>
          <div class="bg-brand-50 rounded-2xl p-4">
            <p class="text-xs text-brand-600 font-medium mb-1">{{ t('stats.booksYear') }}</p>
            <p class="text-3xl font-bold text-brand-800">{{ completionsThisYear.length }}</p>
            <p v-if="pagesThisYear > 0" class="text-xs text-brand-500 mt-0.5">{{ t('stats.pages', { n: pagesThisYear }) }}</p>
          </div>
        </div>
      </section>

      <!-- Currently reading -->
      <section v-if="activeBooks.length" class="mb-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-3">{{ t('dashboard.currentlyReading') }}</h2>
        <div class="flex flex-col gap-3">
          <BookCard
            v-for="book in activeBooks"
            :key="book.id"
            :book="book"
            :last-session="sessionsStore.getLatestSession(book.id)"
          />
        </div>
      </section>

      <!-- Recently added -->
      <section v-if="recentBooks.length" class="mb-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-3">{{ t('dashboard.recentlyAdded') }}</h2>
        <div class="flex flex-col gap-3">
          <BookCard v-for="book in recentBooks" :key="book.id" :book="book" />
        </div>
      </section>

      <div v-if="!booksStore.books.length" class="text-center py-16">
        <p class="text-5xl mb-4">📖</p>
        <p class="text-gray-500 font-medium mb-2">{{ t('dashboard.noBooks') }}</p>
        <p class="text-gray-400 text-sm mb-6">{{ t('dashboard.noBooksHint') }}</p>
        <div class="flex gap-3 justify-center">
          <button @click="router.push({ name: 'scan' })" class="btn-primary">{{ t('dashboard.scan') }}</button>
          <button @click="router.push({ name: 'add' })" class="btn-secondary">{{ t('dashboard.addManually') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>
