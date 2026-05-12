<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { HomeIcon, BookOpenIcon, CameraIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { HomeIcon as HomeIconSolid, BookOpenIcon as BookOpenIconSolid, PlusIcon as PlusIconSolid } from '@heroicons/vue/24/solid'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const showNav = computed(() => !route.meta.public && !route.meta.hideNav)

const navItems = computed(() => [
  { name: 'dashboard', label: t('nav.dashboard'), icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'library',   label: t('nav.library'),   icon: BookOpenIcon, activeIcon: BookOpenIconSolid },
  { name: 'scan',      label: t('nav.scan'),       icon: CameraIcon, activeIcon: CameraIcon },
  { name: 'add',       label: t('nav.add'),        icon: PlusIcon, activeIcon: PlusIconSolid },
])

// PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
const showInstallBanner = ref(false)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt.value = e as BeforeInstallPromptEvent
    showInstallBanner.value = true
  })
  window.addEventListener('appinstalled', () => {
    showInstallBanner.value = false
    installPrompt.value = null
  })
})

async function install() {
  if (!installPrompt.value) return
  await installPrompt.value.prompt()
  const { outcome } = await installPrompt.value.userChoice
  if (outcome === 'accepted') showInstallBanner.value = false
  installPrompt.value = null
}

// PWA update notification
const { needRefresh, updateServiceWorker } = useRegisterSW()
const showUpdateBanner = computed(() => needRefresh.value)

const hasBanner = computed(() => showInstallBanner.value || showUpdateBanner.value)

function dismissUpdate() {
  needRefresh.value = false
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Update banner -->
    <div
      v-if="showUpdateBanner"
      class="fixed top-0 inset-x-0 z-50 bg-green-700 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
    >
      <span class="text-2xl">🔄</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm leading-tight">{{ t('update.title') }}</p>
        <p class="text-xs text-green-200 leading-tight mt-0.5">{{ t('update.hint') }}</p>
      </div>
      <button @click="updateServiceWorker()" class="bg-white text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">
        {{ t('update.update') }}
      </button>
      <button @click="dismissUpdate" class="text-green-300 text-xs flex-shrink-0">
        {{ t('update.dismiss') }}
      </button>
    </div>

    <!-- Install banner -->
    <div
      v-else-if="showInstallBanner"
      class="fixed top-0 inset-x-0 z-50 bg-brand-800 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
    >
      <span class="text-2xl">📚</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm leading-tight">{{ t('install.title') }}</p>
        <p class="text-xs text-brand-200 leading-tight mt-0.5">{{ t('install.hint') }}</p>
      </div>
      <button @click="install" class="bg-white text-brand-800 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">
        {{ t('install.install') }}
      </button>
      <button @click="showInstallBanner = false" class="text-brand-300 text-xs flex-shrink-0">
        {{ t('install.dismiss') }}
      </button>
    </div>

    <main class="flex-1 overflow-y-auto" :class="{ 'pb-20': showNav, 'pt-16': hasBanner }">
      <router-view />
    </main>

    <nav v-if="showNav" class="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex safe-area-inset-bottom z-50">
      <button
        v-for="item in navItems"
        :key="item.name"
        @click="router.push({ name: item.name })"
        class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
        :class="route.name === item.name ? 'text-brand-800' : 'text-gray-400'"
      >
        <component
          :is="route.name === item.name ? item.activeIcon : item.icon"
          class="w-6 h-6"
          :class="item.name === 'scan' ? 'w-7 h-7' : ''"
        />
        <span class="text-xs font-medium">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>
