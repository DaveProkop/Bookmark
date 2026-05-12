<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const { t } = useI18n()

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const done = ref(false)
const ready = ref(false)

onMounted(() => {
  // Supabase redirects here with the recovery session already in the URL hash.
  // The SDK picks it up automatically via onAuthStateChange.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') ready.value = true
  })
})

async function submit() {
  if (password.value !== confirm.value) {
    error.value = t('resetPassword.mismatch')
    return
  }
  loading.value = true
  error.value = null
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false
  if (err) {
    error.value = err.message
  } else {
    done.value = true
    setTimeout(() => router.push({ name: 'login' }), 2000)
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-50">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-6xl mb-3">📚</div>
        <h1 class="text-3xl font-bold text-brand-900">Bookmark</h1>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold text-gray-800 mb-5">{{ t('resetPassword.title') }}</h2>

        <div v-if="done" class="text-center py-2">
          <p class="text-2xl mb-3">✅</p>
          <p class="text-gray-700 text-sm">{{ t('resetPassword.success') }}</p>
        </div>

        <div v-else-if="!ready" class="flex justify-center py-6">
          <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <form v-else @submit.prevent="submit" class="flex flex-col gap-3">
          <input v-model="password" type="password" :placeholder="t('resetPassword.newPassword')" class="input" required minlength="6" />
          <input v-model="confirm" type="password" :placeholder="t('resetPassword.confirm')" class="input" required minlength="6" />

          <div v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg p-3">{{ error }}</div>

          <button type="submit" :disabled="loading" class="btn-primary mt-2">
            {{ loading ? t('resetPassword.loading') : t('resetPassword.submit') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
