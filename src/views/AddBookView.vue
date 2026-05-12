<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books'
import StarRating from '@/components/StarRating.vue'
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const booksStore = useBooksStore()

const form = ref({
  title: '',
  author: '',
  year: null as number | null,
  isbn: '',
  location: '',
  notes: '',
  my_rating: null as number | null,
  cover_url: null as string | null,
})
const saving = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  if (route.query.isbn) form.value.isbn = String(route.query.isbn)
})

async function save() {
  if (!form.value.title.trim()) { error.value = t('addBook.titleRequired'); return }
  saving.value = true
  error.value = null
  const book = await booksStore.addBook({
    title: form.value.title.trim(),
    author: form.value.author.trim() || null,
    year: form.value.year,
    isbn: form.value.isbn.trim() || null,
    location: form.value.location.trim() || null,
    notes: form.value.notes.trim() || null,
    my_rating: form.value.my_rating,
    cover_url: null,
  })
  saving.value = false
  if (book) router.push({ name: 'book', params: { id: book.id } })
  else error.value = booksStore.error ?? t('addBook.saveError')
}
</script>

<template>
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
          <label class="text-sm font-medium text-gray-600 mb-1 block">{{ t('addBook.isbn') }}</label>
          <input v-model="form.isbn" class="input" placeholder="978…" />
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
