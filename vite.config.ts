import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))
const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  base: isProd ? '/Bookmark/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Bookmark – Čtenářský deník',
        short_name: 'Bookmark',
        description: 'Domácí čtenářský deník s čárovým kódem',
        theme_color: '#92400e',
        background_color: '#fffbeb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: isProd ? '/Bookmark/' : '/',
        scope: isProd ? '/Bookmark/' : '/',
        icons: [
          { src: `${isProd ? '/Bookmark/' : '/'}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${isProd ? '/Bookmark/' : '/'}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${isProd ? '/Bookmark/' : '/'}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'], // html excluded → network-first on hard refresh
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/covers\.openlibrary\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'book-covers', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
})
