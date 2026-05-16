import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('@/views/ResetPasswordView.vue'), meta: { public: true } },
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/library', name: 'library', component: () => import('@/views/LibraryView.vue') },
    { path: '/book/:id', name: 'book', component: () => import('@/views/BookDetailView.vue') },
    { path: '/scan', name: 'scan', component: () => import('@/views/ScanView.vue'), meta: { hideNav: true } },
    { path: '/add', name: 'add', component: () => import('@/views/AddBookView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  ]
})

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session && !to.meta.public) return { name: 'login' }
  if (session && to.name === 'login') return { name: 'dashboard' }
})

export default router
