import { ref } from 'vue'

export const isDark = ref(false)

export function initDarkMode() {
  const saved = localStorage.getItem('darkMode')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = saved === 'dark' || (saved === null && prefersDark)
  applyDark(isDark.value)
}

export function toggleDarkMode() {
  isDark.value = !isDark.value
  applyDark(isDark.value)
  localStorage.setItem('darkMode', isDark.value ? 'dark' : 'light')
}

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}
