import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ReadingSession, SessionInsert } from '@/types'

export const useSessionsStore = defineStore('sessions', () => {
  const sessionsByBook = ref<Record<string, ReadingSession[]>>({})

  async function fetchBookSessions(bookId: string): Promise<ReadingSession[]> {
    const { data } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('book_id', bookId)
      .order('timestamp', { ascending: false })
    sessionsByBook.value[bookId] = data ?? []
    return data ?? []
  }

  async function addSession(session: SessionInsert): Promise<ReadingSession | null> {
    const { data, error } = await supabase
      .from('reading_sessions')
      .insert(session)
      .select()
      .single()
    if (error || !data) return null
    if (!sessionsByBook.value[session.book_id]) sessionsByBook.value[session.book_id] = []
    sessionsByBook.value[session.book_id].unshift(data)
    return data
  }

  function getLatestSession(bookId: string): ReadingSession | null {
    return sessionsByBook.value[bookId]?.[0] ?? null
  }

  function getBookStatus(bookId: string): ReadingSession['status'] | null {
    return getLatestSession(bookId)?.status ?? null
  }

  return { sessionsByBook, fetchBookSessions, addSession, getLatestSession, getBookStatus }
})
