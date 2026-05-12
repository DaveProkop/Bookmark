import { createI18n } from 'vue-i18n'
import en from './locales/en'
import cs from './locales/cs'

const savedLocale = localStorage.getItem('locale') ?? 'cs'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, cs },
})

export function setLocale(locale: 'en' | 'cs') {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
}

export function getLocale(): 'en' | 'cs' {
  return i18n.global.locale.value as 'en' | 'cs'
}
