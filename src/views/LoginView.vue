<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { setLocale, getLocale } from '@/i18n'

const router = useRouter()
const { t, locale } = useI18n()
const appVersion = import.meta.env.VITE_APP_VERSION
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const mode = ref<'login' | 'register' | 'forgot'>('login')
const resetSent = ref(false)
const registerSent = ref(false)

async function submit() {
  loading.value = true
  error.value = null

  if (mode.value === 'forgot') {
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) error.value = translateAuthError(err.message)
    else resetSent.value = true
    loading.value = false
    return
  }

  if (mode.value === 'login') {
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    if (err) error.value = translateAuthError(err.message)
    else router.push({ name: 'dashboard' })
  } else {
    const { error: err } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (err) {
      error.value = translateAuthError(err.message)
    } else {
      email.value = ''
      password.value = ''
      registerSent.value = true
    }
  }
  loading.value = false
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return t('login.errorInvalidCredentials')
  if (m.includes('email not confirmed'))
    return t('login.errorEmailNotConfirmed')
  if (m.includes('user already registered') || m.includes('already been registered'))
    return t('login.errorAlreadyRegistered')
  if (m.includes('password should be at least'))
    return t('login.errorPasswordTooShort')
  if (m.includes('unable to validate email') || m.includes('invalid format'))
    return t('login.errorInvalidEmail')
  if (m.includes('rate limit') || m.includes('too many requests'))
    return t('login.errorRateLimit')
  if (m.includes('for security purposes'))
    return t('login.errorRateLimit')
  return message
}

function toggleLocale() {
  setLocale(getLocale() === 'en' ? 'cs' : 'en')
}

function switchMode(m: 'login' | 'register' | 'forgot') {
  mode.value = m
  error.value = null
  resetSent.value = false
  registerSent.value = false
  email.value = ''
  password.value = ''
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-zinc-950">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-brand-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span class="text-4xl">📚</span>
        </div>
        <h1 class="text-3xl font-black text-gray-900 dark:text-zinc-100">Bookmark</h1>
        <p class="text-gray-400 dark:text-zinc-500 mt-1">{{ t('login.tagline') }}</p>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-zinc-200">
            {{ mode === 'login' ? t('login.signIn') : mode === 'register' ? t('login.createAccount') : t('login.resetPassword') }}
          </h2>
          <button @click="toggleLocale" class="text-xs font-medium text-gray-400 hover:text-brand-700 dark:text-zinc-500 dark:hover:text-brand-400 uppercase">
            {{ locale === 'en' ? 'CS' : 'EN' }}
          </button>
        </div>

        <!-- Reset sent confirmation -->
        <div v-if="resetSent" class="text-center py-2">
          <p class="text-2xl mb-3">📬</p>
          <p class="text-gray-700 dark:text-zinc-300 text-sm mb-4">{{ t('login.resetEmailSent') }}</p>
          <button @click="switchMode('login')" class="text-brand-700 dark:text-brand-400 font-medium text-sm">
            {{ t('login.backToLogin') }}
          </button>
        </div>

        <!-- Register sent confirmation -->
        <div v-else-if="registerSent" class="text-center py-2">
          <p class="text-2xl mb-3">✅</p>
          <p class="text-gray-700 dark:text-zinc-300 text-sm mb-4">{{ t('login.registerEmailSent') }}</p>
          <button @click="switchMode('login')" class="text-brand-700 dark:text-brand-400 font-medium text-sm">
            {{ t('login.backToLogin') }}
          </button>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="flex flex-col gap-3">
          <input v-model="email" type="email" placeholder="Email" class="input" required autocomplete="email" />
          <input v-if="mode !== 'forgot'" v-model="password" type="password" :placeholder="t('login.password')" class="input" required :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" minlength="6" />

          <div v-if="error" class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/50 rounded-lg p-3">{{ error }}</div>

          <button type="submit" :disabled="loading" class="btn-primary mt-2">
            {{ loading ? t('login.loading') : mode === 'login' ? t('login.signIn') : mode === 'register' ? t('login.createAccount') : t('login.resetPassword') }}
          </button>
        </form>

        <div v-if="!resetSent && !registerSent" class="mt-4 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-zinc-500">
          <p v-if="mode === 'login'">
            {{ t('login.noAccount') }}
            <button @click="switchMode('register')" class="text-brand-700 dark:text-brand-400 font-medium ml-1">{{ t('login.signUp') }}</button>
          </p>
          <p v-if="mode === 'register'">
            {{ t('login.hasAccount') }}
            <button @click="switchMode('login')" class="text-brand-700 dark:text-brand-400 font-medium ml-1">{{ t('login.signInBtn') }}</button>
          </p>
          <button v-if="mode === 'login'" @click="switchMode('forgot')" class="text-gray-400 hover:text-brand-700 dark:text-zinc-600 dark:hover:text-brand-400 text-xs">
            {{ t('login.forgotPassword') }}
          </button>
          <button v-if="mode === 'forgot'" @click="switchMode('login')" class="text-gray-400 hover:text-brand-700 dark:text-zinc-600 dark:hover:text-brand-400 text-xs">
            {{ t('login.backToLogin') }}
          </button>
        </div>
      </div>
    </div>
    <p class="text-center text-xs text-gray-300 dark:text-zinc-700 mt-6">v{{ appVersion }}</p>
  </div>
</template>
