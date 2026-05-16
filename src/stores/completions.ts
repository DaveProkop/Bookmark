import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { BookCompletion } from '@/types'

export const useCompletionsStore = defineStore('completions', () => {
  const allCompletions = ref<BookCompletion[]>([])
  const completionsByBook = ref<Record<string, BookCompletion[]>>({})

  async function fetchAllCompletions() {
    const { data } = await supabase
      .from('book_completions')
      .select('*')
      .order('finished_at', { ascending: false })
    allCompletions.value = data ?? []
  }

  async function fetchBookCompletions(bookId: string) {
    const { data } = await supabase
      .from('book_completions')
      .select('*')
      .eq('book_id', bookId)
      .order('finished_at', { ascending: false })
    completionsByBook.value[bookId] = data ?? []
  }

  async function markFinished(bookId: string): Promise<BookCompletion | null> {
    const { data } = await supabase
      .from('book_completions')
      .insert({ book_id: bookId })
      .select()
      .single()
    if (data) {
      completionsByBook.value[bookId] = [data, ...(completionsByBook.value[bookId] ?? [])]
      allCompletions.value.unshift(data)
    }
    return data
  }

  function getBookCompletions(bookId: string): BookCompletion[] {
    return completionsByBook.value[bookId] ?? []
  }

  function getCompletionsByYear(year: number): BookCompletion[] {
    return allCompletions.value.filter(c => new Date(c.finished_at).getFullYear() === year)
  }

  function getCompletionsByMonth(year: number, month: number): BookCompletion[] {
    return allCompletions.value.filter(c => {
      const d = new Date(c.finished_at)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }

  return {
    allCompletions, completionsByBook,
    fetchAllCompletions, fetchBookCompletions, markFinished,
    getBookCompletions, getCompletionsByYear, getCompletionsByMonth,
  }
})
