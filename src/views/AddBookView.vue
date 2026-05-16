<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books'
import StarRating from '@/components/StarRating.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import { lookupBook } from '@/lib/bookApi'
import { ChevronLeftIcon, CameraIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const booksStore = useBooksStore()

const form = ref({
  title: '',
  author: '',
  year: null as number | null,
  isbn: '',
  total_pages: null as number | null,
  location: '',
  notes: '',
  my_rating: null as number | null,
  cover_url: null as string | null,
})
const saving = ref(false)
const error = ref<string | null>(null)
const showScanner = ref(false)
const lookingUp = ref(false)

onMounted(() => {
  if (route.query.isbn) form.value.isbn = String(route.query.isbn)
})

async function fillFromLookup(isbn: string) {
  lookingUp.value = true
  try {
    const result = await lookupBook(isbn)
    if (result) {
      if (result.title) form.value.title = result.title
      if (result.author) form.value.author = result.author ?? ''
      if (result.year) form.value.year = result.year
      if (result.cover_url) form.value.cover_url = result.cover_url
    }
  } finally {
    lookingUp.value = false
  }
}

async function onIsbnScanned(isbn: string) {
  showScanner.value = false
  form.value.isbn = isbn
  if (!form.value.title.trim()) await fillFromLookup(isbn)
}

async function onIsbnLookup() {
  const isbn = form.value.isbn.trim()
  if (!isbn) return
  await fillFromLookup(isbn)
}

async function save() {
  if (!form.value.title.trim()) { error.value = t('addBook.titleRequired'); return }
  saving.value = true
  error.value = null
  const book = await booksStore.addBook({
    title: form.value.title.trim(),
    author: form.value.author.trim() || null,
    year: form.value.year,
    isbn: form.value.isbn.trim() || null,
    total_pages: form.value.total_pages,
    location: form.value.location.trim() || null,
    notes: form.value.notes.trim() || null,
    my_rating: form.value.my_rating,
    cover_url: form.value.cover_url,
  })
  saving.value = false
  if (book) router.push({ name: 'book', params: { id: book.id } })
  else error.value = booksStore.error ?? t('addBook.saveError')
}
</script>

<template>
  <!-- Scanner overlay -->
  <div v-if="showScanner" class="fixed inset-0 z-50 bg-black flex flex-col">
    <div class="absolute top-0 inset-x-0 z-10 flex items-center gap-3 p-4 bg-gradient-to-b from-black/60 to-transparent">
      <button @click="showScanner = false" class="text-white p-1">
        <ChevronLeftIcon class="w-6 h-6" />
      </button>
      <h1 class="text-white font-semibold">{{ t('scan.title') }}</h1>
    </div>
    <BarcodeScanner @detected="onIsbnScanned" class="flex-1" />
  </div>

  <!-- Lookup loading overlay -->
  <div v-if="lookingUp" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-2xl p-6 text-center shadow-xl">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p class="text-gray-700 text-sm">{{ t('scan.searching') }}</p>
    </div>
  </div>

  <div class="p-4">
    <header class="flex items-center gap-3 mb-6">
      <button @click="router.back()" class="p-1 text-gray-500"><ChevronLeftIcon class="w-6 h-6" /></button>
      <h1 class="text-2xl font-bold text-brand-900">{{ t('addBook.title') }}</h1>
    </header>

    <form @submit.prevent="save" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.titleLabel') }}</label>
        <input v-model="form.title" class="input" :placeholder="t('addBook.titlePlaceholder')" required />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.author') }}</label>
        <input v-model="form.author" class="input" :placeholder="t('addBook.authorPlaceholder')" />
      </div>
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.year') }}</label>
          <input v-model.number="form.year" type="number" class="input" placeholder="2024" min="1000" max="2099" />
        </div>
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.totalPages') }}</label>
          <input v-model.number="form.total_pages" type="number" class="input" placeholder="352" min="1" />
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.isbn') }}</label>
        <div class="relative">
          <input v-model="form.isbn" class="input pr-16" placeholder="978…" />
          <button
            type="button"
            @click="onIsbnLookup"
            :disabled="!form.isbn.trim() || lookingUp"
            class="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-700 disabled:opacity-30 transition-colors"
            :title="t('addBook.lookupIsbn')"
          >
            <MagnifyingGlassIcon class="w-5 h-5" />
          </button>
          <button
            type="button"
            @click="showScanner = true"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-700 transition-colors"
            :title="t('scan.title')"
          >
            <CameraIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.location') }}</label>
        <input v-model="form.location" class="input" :placeholder="t('addBook.locationPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.myRating') }}</label>
        <StarRating v-model="form.my_rating" class="mt-1" />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.notes') }}</label>
        <textarea v-model="form.notes" class="input h-24 resize-none" :placeholder="t('addBook.notesPlaceholder')" />
      </div>

      <div v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg p-3">{{ error }}</div>

      <button type="submit" :disabled="saving" class="btn-primary w-full">
        {{ saving ? t('addBook.saving') : t('addBook.save') }}
      </button>
    </form>
  </div>
</template>
