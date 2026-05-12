<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { setLocale, getLocale } from '@/i18n'

const router = useRouter()
const { t, locale } = useI18n()
const appVersion = __APP_VERSION__
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const mode = ref<'login' | 'register' | 'forgot'>('login')
const resetSent = ref(false)

async function submit() {
  loading.value = true
  error.value = null

  if (mode.value === 'forgot') {
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) error.value = err.message
    else resetSent.value = true
    loading.value = false
    return
  }

  const { error: err } = mode.value === 'login'
    ? await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    : await supabase.auth.signUp({ email: email.value, password: password.value })

  if (err) error.value = err.message
  else router.push({ name: 'dashboard' })
  loading.value = false
}

function toggleLocale() {
  setLocale(getLocale() === 'en' ? 'cs' : 'en')
}

function switchMode(m: 'login' | 'register' | 'forgot') {
  mode.value = m
  error.value = null
  resetSent.value = false
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-50">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-6xl mb-3">📚</div>
        <h1 class="text-3xl font-bold text-brand-900">Bookmark</h1>
        <p class="text-gray-500 mt-1">{{ t('login.tagline') }}</p>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-semibold text-gray-800">
            {{ mode === 'login' ? t('login.signIn') : mode === 'register' ? t('login.createAccount') : t('login.resetPassword') }}
          </h2>
          <button @click="toggleLocale" class="text-xs font-medium text-gray-400 hover:text-brand-700 uppercase">
            {{ locale === 'en' ? 'CS' : 'EN' }}
          </button>
        </div>

        <!-- Reset sent confirmation -->
        <div v-if="resetSent" class="text-center py-2">
          <p class="text-2xl mb-3">📬</p>
          <p class="text-gray-700 text-sm mb-4">{{ t('login.resetEmailSent') }}</p>
          <button @click="switchMode('login')" class="text-brand-700 font-medium text-sm">
            {{ t('login.backToLogin') }}
          </button>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="flex flex-col gap-3">
          <input v-model="email" type="email" placeholder="Email" class="input" required autocomplete="email" />
          <input v-if="mode !== 'forgot'" v-model="password" type="password" :placeholder="t('login.password')" class="input" required autocomplete="current-password" minlength="6" />

          <div v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg p-3">{{ error }}</div>

          <button type="submit" :disabled="loading" class="btn-primary mt-2">
            {{ loading ? t('login.loading') : mode === 'login' ? t('login.signIn') : mode === 'register' ? t('login.createAccount') : t('login.resetPassword') }}
          </button>
        </form>

        <div v-if="!resetSent" class="mt-4 flex flex-col items-center gap-2 text-sm text-gray-500">
          <p v-if="mode === 'login'">
            {{ t('login.noAccount') }}
            <button @click="switchMode('register')" class="text-brand-700 font-medium ml-1">{{ t('login.signUp') }}</button>
          </p>
          <p v-if="mode === 'register'">
            {{ t('login.hasAccount') }}
            <button @click="switchMode('login')" class="text-brand-700 font-medium ml-1">{{ t('login.signInBtn') }}</button>
          </p>
          <button v-if="mode === 'login'" @click="switchMode('forgot')" class="text-gray-400 hover:text-brand-700 text-xs">
            {{ t('login.forgotPassword') }}
          </button>
          <button v-if="mode === 'forgot'" @click="switchMode('login')" class="text-gray-400 hover:text-brand-700 text-xs">
            {{ t('login.backToLogin') }}
          </button>
        </div>
      </div>
    </div>
    <p class="text-center text-xs text-gray-300 mt-6">v{{ appVersion }}</p>
  </div>
</template>
