<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useBooksStore } from '@/stores/books'
import { useSessionsStore } from '@/stores/sessions'
import BookCard from '@/components/BookCard.vue'
import { ArrowRightOnRectangleIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import { installPromptEvent, isInstalled } from '@/lib/pwaInstall'

const router = useRouter()
const { t, locale } = useI18n()
const booksStore = useBooksStore()
const sessionsStore = useSessionsStore()
const userName = ref('')

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

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userName.value = user?.email?.split('@')[0] ?? ''
  await booksStore.fetchBooks()
  for (const book of booksStore.books.slice(0, 20)) {
    await sessionsStore.fetchBookSessions(book.id)
  }
})

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
