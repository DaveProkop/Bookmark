import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Book, BookInsert, BookUpdate } from '@/types'

export const useBooksStore = defineStore('books', () => {
  const books = ref<Book[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBooks() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) error.value = err.message
    else books.value = data ?? []
    loading.value = false
  }

  async function getBookByIsbn(isbn: string): Promise<Book | null> {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('isbn', isbn)
      .maybeSingle()
    return data
  }

  async function getBookById(id: string): Promise<Book | null> {
    const local = books.value.find(b => b.id === id)
    if (local) return local
    const { data } = await supabase.from('books').select('*').eq('id', id).single()
    return data
  }

  async function addBook(book: BookInsert): Promise<Book | null> {
    const { data, error: err } = await supabase.from('books').insert(book).select().single()
    if (err) { error.value = err.message; return null }
    if (data) books.value.unshift(data)
    return data
  }

  async function updateBook(id: string, updates: BookUpdate): Promise<void> {
    const { error: err } = await supabase.from('books').update(updates).eq('id', id)
    if (err) { error.value = err.message; return }
    const idx = books.value.findIndex(b => b.id === id)
    if (idx !== -1) books.value[idx] = { ...books.value[idx], ...updates }
  }

  async function deleteBook(id: string): Promise<void> {
    const { error: err } = await supabase.from('books').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    books.value = books.value.filter(b => b.id !== id)
  }

  function searchBooks(query: string): Book[] {
    if (!query.trim()) return books.value
    const q = query.toLowerCase()
    return books.value.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      b.location?.toLowerCase().includes(q)
    )
  }

  function exportJson(): string {
    return JSON.stringify(books.value, null, 2)
  }

  async function importJson(json: string): Promise<{ added: number; skipped: number }> {
    const items: BookInsert[] = JSON.parse(json)
    let added = 0, skipped = 0
    for (const item of items) {
      const { isbn, title, author, year, total_pages, cover_url, location, my_rating, notes } = item
      const { error: err } = await supabase.from('books').insert({ isbn, title, author, year, total_pages, cover_url, location, my_rating, notes })
      if (err) skipped++
      else added++
    }
    await fetchBooks()
    return { added, skipped }
  }

  return { books, loading, error, fetchBooks, getBookByIsbn, getBookById, addBook, updateBook, deleteBook, searchBooks, exportJson, importJson }
})
