<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { HomeIcon, BookOpenIcon, CameraIcon, PlusIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { HomeIcon as HomeIconSolid, BookOpenIcon as BookOpenIconSolid, PlusIcon as PlusIconSolid, Cog6ToothIcon as Cog6ToothIconSolid } from '@heroicons/vue/24/solid'
import { installPromptEvent, isInstalled, isIOS } from '@/lib/pwaInstall'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const showNav = computed(() => !route.meta.public && !route.meta.hideNav)

const navItems = computed(() => [
  { name: 'dashboard', label: t('nav.dashboard'), icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'library',   label: t('nav.library'),   icon: BookOpenIcon, activeIcon: BookOpenIconSolid },
  { name: 'scan',      label: t('nav.scan'),       icon: CameraIcon, activeIcon: CameraIcon },
  { name: 'add',       label: t('nav.add'),        icon: PlusIcon, activeIcon: PlusIconSolid },
  { name: 'settings',  label: t('nav.settings'),  icon: Cog6ToothIcon, activeIcon: Cog6ToothIconSolid },
])

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_, reg) {
    if (!reg) return
    const check = () => reg.update().catch(() => {})
    setTimeout(check, 60_000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

const installDismissed = ref(false)
const iosDismissed = ref(false)

const showInstallBanner = computed(() =>
  !isInstalled.value && !installDismissed.value && !!installPromptEvent.value
)
const showIOSBanner = computed(() =>
  !isInstalled.value && !iosDismissed.value && isIOS && !installPromptEvent.value
)

async function install() {
  if (!installPromptEvent.value) return
  await installPromptEvent.value.prompt()
  const { outcome } = await installPromptEvent.value.userChoice
  if (outcome === 'accepted') installPromptEvent.value = null
  else installDismissed.value = true
}

const hasBanner = computed(() =>
  needRefresh.value || showInstallBanner.value || showIOSBanner.value
)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Update banner -->
    <div v-if="needRefresh"
      class="fixed top-0 inset-x-0 z-50 bg-brand-700 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
    >
      <span class="text-2xl">🔄</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm leading-tight">{{ t('update.title') }}</p>
        <p class="text-xs text-brand-200 leading-tight mt-0.5">{{ t('update.hint') }}</p>
      </div>
      <button @click="updateServiceWorker(true)" class="bg-white text-brand-700 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">
        {{ t('update.update') }}
      </button>
      <button @click="needRefresh = false" class="text-brand-200 text-xs flex-shrink-0">
        {{ t('update.dismiss') }}
      </button>
    </div>

    <!-- Android install banner -->
    <div v-else-if="showInstallBanner"
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
      <button @click="installDismissed = true" class="text-brand-300 text-xs flex-shrink-0">
        {{ t('install.dismiss') }}
      </button>
    </div>

    <!-- iOS install banner -->
    <div v-else-if="showIOSBanner"
      class="fixed top-0 inset-x-0 z-50 bg-brand-800 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
    >
      <span class="text-2xl">📚</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm leading-tight">{{ t('install.iosTitle') }}</p>
        <p class="text-xs text-brand-200 leading-tight mt-0.5">
          {{ t('install.iosHint', { share: '⎙' }) }}
        </p>
      </div>
      <button @click="iosDismissed = true" class="text-brand-300 text-xs flex-shrink-0">
        {{ t('install.iosClose') }}
      </button>
    </div>

    <main class="flex-1 overflow-y-auto" :class="{ 'pb-20': showNav, 'pt-16': hasBanner }">
      <router-view />
    </main>

    <nav v-if="showNav"
      class="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex safe-area-inset-bottom z-50
             dark:bg-zinc-900 dark:border-zinc-800"
    >
      <button
        v-for="item in navItems"
        :key="item.name"
        @click="router.push({ name: item.name })"
        class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
        :class="route.name === item.name
          ? 'text-brand-700 dark:text-brand-400'
          : 'text-gray-400 dark:text-zinc-500'"
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
