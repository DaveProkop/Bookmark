import '@/lib/pwaInstall'
import { initDarkMode } from '@/lib/darkMode'
initDarkMode() // apply before Vue mounts to avoid flash
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { i18n } from '@/i18n'
import '@/style.css'

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
