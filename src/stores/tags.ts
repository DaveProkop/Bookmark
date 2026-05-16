import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types'

const DEFAULT_TAG_NAMES = ['Knihovna', 'Právě čtu', 'Chci si přečíst']

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const bookTagIds = ref<Record<string, string[]>>({})
  const initialized = ref(false)

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').order('created_at')
    if (data !== null) {
      if (data.length === 0 && !initialized.value) {
        await initDefaults()
      } else {
        tags.value = data
      }
      initialized.value = true
    }
  }

  async function initDefaults() {
    for (const name of DEFAULT_TAG_NAMES) {
      await supabase.from('tags').insert({ name })
    }
    const { data } = await supabase.from('tags').select('*').order('created_at')
    tags.value = data ?? []
  }

  async function fetchAllBookTags() {
    const { data } = await supabase.from('book_tags').select('book_id, tag_id')
    bookTagIds.value = {}
    for (const row of data ?? []) {
      if (!bookTagIds.value[row.book_id]) bookTagIds.value[row.book_id] = []
      bookTagIds.value[row.book_id].push(row.tag_id)
    }
  }

  async function fetchBookTags(bookId: string) {
    const { data } = await supabase.from('book_tags').select('tag_id').eq('book_id', bookId)
    bookTagIds.value[bookId] = data?.map(r => r.tag_id) ?? []
  }

  async function addTag(name: string): Promise<Tag | null> {
    const { data } = await supabase.from('tags').insert({ name }).select().single()
    if (data) tags.value.push(data)
    return data
  }

  async function updateTag(id: string, name: string): Promise<boolean> {
    const { error } = await supabase.from('tags').update({ name }).eq('id', id)
    if (error) return false
    const tag = tags.value.find(t => t.id === id)
    if (tag) tag.name = name
    return true
  }

  async function deleteTag(id: string): Promise<void> {
    await supabase.from('tags').delete().eq('id', id)
    tags.value = tags.value.filter(t => t.id !== id)
    for (const bookId in bookTagIds.value) {
      bookTagIds.value[bookId] = bookTagIds.value[bookId].filter(tid => tid !== id)
    }
  }

  async function addTagToBook(bookId: string, tagId: string): Promise<void> {
    const { error } = await supabase.from('book_tags').insert({ book_id: bookId, tag_id: tagId })
    if (!error) {
      if (!bookTagIds.value[bookId]) bookTagIds.value[bookId] = []
      if (!bookTagIds.value[bookId].includes(tagId)) bookTagIds.value[bookId].push(tagId)
    }
  }

  async function removeTagFromBook(bookId: string, tagId: string): Promise<void> {
    await supabase.from('book_tags').delete().eq('book_id', bookId).eq('tag_id', tagId)
    bookTagIds.value[bookId] = (bookTagIds.value[bookId] ?? []).filter(id => id !== tagId)
  }

  function getBookTagIds(bookId: string): string[] {
    return bookTagIds.value[bookId] ?? []
  }

  function getTagById(id: string): Tag | undefined {
    return tags.value.find(t => t.id === id)
  }

  return {
    tags, bookTagIds, initialized,
    fetchTags, fetchAllBookTags, fetchBookTags,
    addTag, updateTag, deleteTag,
    addTagToBook, removeTagFromBook,
    getBookTagIds, getTagById,
  }
})
