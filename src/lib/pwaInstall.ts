import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const installPromptEvent = ref<BeforeInstallPromptEvent | null>(null)
export const isInstalled = ref(window.matchMedia('(display-mode: standalone)').matches)
export const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
export const updateAvailable = ref(false)

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installPromptEvent.value = e as BeforeInstallPromptEvent
})

window.addEventListener('appinstalled', () => {
  installPromptEvent.value = null
  isInstalled.value = true
})

// Only flag as "update" if there was already a controller — first install doesn't count
const hadController = !!navigator.serviceWorker?.controller

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (hadController) updateAvailable.value = true
})

// Proactively check for a new SW on tab focus + after 60s
navigator.serviceWorker?.ready.then((reg) => {
  const check = () => reg.update().catch(() => {})
  setTimeout(check, 60_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
})
