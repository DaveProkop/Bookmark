<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { HomeIcon, BookOpenIcon, CameraIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { HomeIcon as HomeIconSolid, BookOpenIcon as BookOpenIconSolid, PlusIcon as PlusIconSolid } from '@heroicons/vue/24/solid'
import { setLocale, getLocale } from '@/i18n'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const showNav = computed(() => !route.meta.public && !route.meta.hideNav)

const navItems = computed(() => [
  { name: 'dashboard', label: t('nav.dashboard'), icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'library',   label: t('nav.library'),   icon: BookOpenIcon, activeIcon: BookOpenIconSolid },
  { name: 'scan',      label: t('nav.scan'),       icon: CameraIcon, activeIcon: CameraIcon },
  { name: 'add',       label: t('nav.add'),        icon: PlusIcon, activeIcon: PlusIconSolid },
])

function toggleLocale() {
  setLocale(getLocale() === 'en' ? 'cs' : 'en')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <main class="flex-1 overflow-y-auto" :class="{ 'pb-20': showNav }">
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
      <button
        @click="toggleLocale"
        class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors text-gray-400 hover:text-brand-800"
      >
        <span class="text-lg leading-none">🌐</span>
        <span class="text-xs font-medium uppercase">{{ locale === 'en' ? 'CS' : 'EN' }}</span>
      </button>
    </nav>
  </div>
</template>
