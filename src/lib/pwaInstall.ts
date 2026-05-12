import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const installPromptEvent = ref<BeforeInstallPromptEvent | null>(null)
export const isInstalled = ref(window.matchMedia('(display-mode: standalone)').matches)
export const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
export const updateAvailable = ref(false)

// Register all listeners ASAP — before Vue mounts
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installPromptEvent.value = e as BeforeInstallPromptEvent
})

window.addEventListener('appinstalled', () => {
  installPromptEvent.value = null
  isInstalled.value = true
})

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  updateAvailable.value = true
})
