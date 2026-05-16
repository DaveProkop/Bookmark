<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useBooksStore } from '@/stores/books'
import { useTagsStore } from '@/stores/tags'
import { useCompletionsStore } from '@/stores/completions'
import {
  ArrowRightOnRectangleIcon, TrashIcon, ExclamationTriangleIcon,
  PencilIcon, CheckIcon, XMarkIcon, PlusIcon,
} from '@heroicons/vue/24/outline'
import { getBookLookupSource, setBookLookupSource, type BookLookupSource } from '@/lib/bookApi'

const router = useRouter()
const { t } = useI18n()
const booksStore = useBooksStore()
const tagsStore = useTagsStore()
const completionsStore = useCompletionsStore()

const userEmail = ref('')
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const lookupSource = ref<BookLookupSource>(getBookLookupSource())

const newTagName = ref('')
const addingTag = ref(false)
const editingTagId = ref<string | null>(null)
const editingTagName = ref('')

const sources: { value: BookLookupSource; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.sourceAuto' },
  { value: 'openLibrary', labelKey: 'settings.sourceOpenLibrary' },
  { value: 'googleBooks', labelKey: 'settings.sourceGoogleBooks' },
  { value: 'databazeknih', labelKey: 'settings.sourceDatabazeknih' },
  { value: 'cbdb', labelKey: 'settings.sourceCbdb' },
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

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

const hasStats = computed(() => completionsStore.allCompletions.length > 0)

function onSourceChange(value: BookLookupSource) {
  lookupSource.value = value
  setBookLookupSource(value)
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userEmail.value = user?.email ?? ''
  await Promise.all([
    tagsStore.fetchTags(),
    booksStore.fetchBooks(),
    completionsStore.fetchAllCompletions(),
  ])
})

async function addTag() {
  const name = newTagName.value.trim()
  if (!name) return
  addingTag.value = true
  await tagsStore.addTag(name)
  newTagName.value = ''
  addingTag.value = false
}

function startEditTag(id: string, name: string) {
  editingTagId.value = id
  editingTagName.value = name
}

async function saveEditTag() {
  if (!editingTagId.value || !editingTagName.value.trim()) return
  await tagsStore.updateTag(editingTagId.value, editingTagName.value.trim())
  editingTagId.value = null
}

async function deleteTag(id: string, name: string) {
  if (!confirm(t('tags.deleteConfirm', { name }))) return
  await tagsStore.deleteTag(id)
}

async function signOut() {
  await supabase.auth.signOut()
  router.push({ name: 'login' })
}

async function deleteAccount() {
  deleting.value = true
  deleteError.value = null
  const { error } = await supabase.functions.invoke('delete-account')
  if (error) {
    deleteError.value = t('settings.deleteError')
    deleting.value = false
    return
  }
  await supabase.auth.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="p-4 max-w-lg mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ t('settings.title') }}</h1>

    <!-- Account info -->
    <div class="card mb-4">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{{ t('settings.account') }}</p>
      <p class="text-sm text-gray-700 mb-4 break-all">{{ userEmail }}</p>
      <button @click="signOut" class="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        {{ t('settings.signOut') }}
      </button>
    </div>

    <!-- Statistics -->
    <div class="card mb-4">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{{ t('stats.title') }}</p>
      <div v-if="hasStats" class="grid grid-cols-2 gap-3">
        <div class="bg-brand-50 rounded-xl p-3">
          <p class="text-xs text-brand-600 font-medium mb-1">{{ t('stats.booksMonth') }}</p>
          <p class="text-2xl font-bold text-brand-800">{{ completionsThisMonth.length }}</p>
          <p v-if="pagesThisMonth > 0" class="text-xs text-brand-500 mt-0.5">{{ t('stats.pages', { n: pagesThisMonth }) }}</p>
        </div>
        <div class="bg-brand-50 rounded-xl p-3">
          <p class="text-xs text-brand-600 font-medium mb-1">{{ t('stats.booksYear') }}</p>
          <p class="text-2xl font-bold text-brand-800">{{ completionsThisYear.length }}</p>
          <p v-if="pagesThisYear > 0" class="text-xs text-brand-500 mt-0.5">{{ t('stats.pages', { n: pagesThisYear }) }}</p>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">{{ t('stats.noData') }}</p>
    </div>

    <!-- Tags management -->
    <div class="card mb-4">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{{ t('tags.title') }}</p>

      <!-- Add new tag -->
      <form @submit.prevent="addTag" class="flex gap-2 mb-3">
        <input
          v-model="newTagName"
          class="input flex-1 text-sm"
          :placeholder="t('tags.newTagPlaceholder')"
          maxlength="40"
        />
        <button type="submit" :disabled="!newTagName.trim() || addingTag" class="btn-secondary px-3 py-2 text-sm flex items-center gap-1 disabled:opacity-40">
          <PlusIcon class="w-4 h-4" />
          {{ t('tags.add') }}
        </button>
      </form>

      <!-- Tag list -->
      <div v-if="tagsStore.tags.length" class="space-y-2">
        <div v-for="tag in tagsStore.tags" :key="tag.id" class="flex items-center gap-2">
          <template v-if="editingTagId === tag.id">
            <input
              v-model="editingTagName"
              class="input flex-1 text-sm py-1.5"
              :placeholder="t('tags.editPlaceholder')"
              @keyup.enter="saveEditTag"
              @keyup.escape="editingTagId = null"
              maxlength="40"
            />
            <button @click="saveEditTag" class="p-1.5 text-brand-700 hover:text-brand-900">
              <CheckIcon class="w-4 h-4" />
            </button>
            <button @click="editingTagId = null" class="p-1.5 text-gray-400 hover:text-gray-600">
              <XMarkIcon class="w-4 h-4" />
            </button>
          </template>
          <template v-else>
            <span class="flex-1 text-sm text-gray-700 px-3 py-1.5 bg-gray-50 rounded-lg">{{ tag.name }}</span>
            <button @click="startEditTag(tag.id, tag.name)" class="p-1.5 text-gray-400 hover:text-brand-700">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteTag(tag.id, tag.name)" class="p-1.5 text-gray-400 hover:text-red-600">
              <TrashIcon class="w-4 h-4" />
            </button>
          </template>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">{{ t('tags.noTags') }}</p>
    </div>

    <!-- Book lookup source -->
    <div class="card mb-4">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{{ t('settings.bookLookup') }}</p>
      <p class="text-sm text-gray-500 mb-3">{{ t('settings.bookLookupSource') }}</p>
      <div class="flex flex-col gap-2">
        <label
          v-for="src in sources"
          :key="src.value"
          class="flex items-center gap-3 cursor-pointer"
        >
          <input
            type="radio"
            name="lookupSource"
            :value="src.value"
            :checked="lookupSource === src.value"
            @change="onSourceChange(src.value)"
            class="w-4 h-4 accent-brand-600"
          />
          <span class="text-sm text-gray-700">{{ t(src.labelKey) }}</span>
        </label>
      </div>
    </div>

    <!-- Danger zone -->
    <div class="card border border-red-200">
      <p class="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">{{ t('settings.dangerZone') }}</p>
      <p class="text-sm text-gray-500 mb-4">{{ t('settings.deleteHint') }}</p>
      <button
        @click="showDeleteConfirm = true"
        class="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
      >
        <TrashIcon class="w-5 h-5" />
        {{ t('settings.deleteAccount') }}
      </button>
    </div>
  </div>

  <!-- Confirmation modal -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <ExclamationTriangleIcon class="w-6 h-6 text-red-600" />
          </span>
          <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.deleteConfirmTitle') }}</h2>
        </div>
        <p class="text-sm text-gray-600 mb-6">{{ t('settings.deleteConfirmText') }}</p>

        <div v-if="deleteError" class="text-red-600 text-sm bg-red-50 rounded-lg p-3 mb-4">{{ deleteError }}</div>

        <div class="flex gap-3">
          <button
            @click="showDeleteConfirm = false"
            :disabled="deleting"
            class="flex-1 btn-secondary"
          >
            {{ t('settings.cancel') }}
          </button>
          <button
            @click="deleteAccount"
            :disabled="deleting"
            class="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
          >
            {{ deleting ? t('settings.deleting') : t('settings.deleteConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
