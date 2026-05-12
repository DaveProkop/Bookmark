import type { BookLookupResult } from '@/types'

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
  try {
    const result = await lookupOpenLibrary(isbn)
    if (result) return result
  } catch {}

  try {
    return await lookupGoogleBooks(isbn)
  } catch {}

  return null
}
