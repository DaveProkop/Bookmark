import type { BookLookupResult } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export type BookLookupSource = 'auto' | 'openLibrary' | 'googleBooks' | 'databazeknih' | 'cbdb'
const STORAGE_KEY = 'bookLookupSource'

export function getBookLookupSource(): BookLookupSource {
  const stored = localStorage.getItem(STORAGE_KEY)
  const valid: BookLookupSource[] = ['auto', 'openLibrary', 'googleBooks', 'databazeknih', 'cbdb']
  return valid.includes(stored as BookLookupSource) ? (stored as BookLookupSource) : 'auto'
}

export function setBookLookupSource(source: BookLookupSource): void {
  localStorage.setItem(STORAGE_KEY, source)
}

async function lookupDatabazeknih(isbn: string): Promise<BookLookupResult | null> {
  if (!SUPABASE_URL) return null
  const res = await fetch(`${SUPABASE_URL}/functions/v1/book-lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ isbn }),
  })
  if (!res.ok) return null
  return await res.json()
}

async function lookupCbdb(isbn: string): Promise<BookLookupResult | null> {
  if (!SUPABASE_URL) return null
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cbdb-lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ isbn }),
  })
  if (!res.ok) return null
  return await res.json()
}

async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  )
  if (!res.ok) return null

  const data = await res.json()
  const book = data[`ISBN:${isbn}`]
  if (!book) return null

  return {
    isbn,
    title: book.title,
    author: book.authors?.[0]?.name ?? null,
    year: book.publish_date ? parseInt(book.publish_date.slice(-4)) || null : null,
    cover_url: book.cover?.large ?? book.cover?.medium ?? null,
    description: book.excerpts?.[0]?.text ?? null,
    external_rating: null,
    external_rating_count: null,
  }
}

async function lookupGoogleBooks(isbn: string): Promise<BookLookupResult | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
  )
  if (!res.ok) return null

  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null

  const info = item.volumeInfo
  return {
    isbn,
    title: info.title,
    author: info.authors?.[0] ?? null,
    year: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) || null : null,
    cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:') ?? null,
    description: info.description ?? null,
    external_rating: info.averageRating ?? null,
    external_rating_count: info.ratingsCount ?? null,
  }
}

export async function lookupBook(isbn: string): Promise<BookLookupResult | null> {
  const source = getBookLookupSource()

  const tryAll = async (fns: Array<() => Promise<BookLookupResult | null>>) => {
    for (const fn of fns) {
      try {
        const result = await fn()
        if (result) return result
      } catch { /* try next */ }
    }
    return null
  }

  if (source === 'openLibrary') return tryAll([() => lookupOpenLibrary(isbn)])
  if (source === 'googleBooks') return tryAll([() => lookupGoogleBooks(isbn)])
  if (source === 'databazeknih') return tryAll([() => lookupDatabazeknih(isbn)])
  if (source === 'cbdb') return tryAll([() => lookupCbdb(isbn)])

  // auto: try all sources in order
  return tryAll([
    () => lookupOpenLibrary(isbn),
    () => lookupGoogleBooks(isbn),
    () => lookupDatabazeknih(isbn),
    () => lookupCbdb(isbn),
  ])
}
