export interface Book {
  id: string
  user_id: string
  isbn: string | null
  title: string
  author: string | null
  year: number | null
  cover_url: string | null
  location: string | null
  my_rating: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReadingSession {
  id: string
  book_id: string
  status: 'STARTED' | 'PAUSED' | 'FINISHED'
  page_number: number | null
  timestamp: string
  notes: string | null
}

export type BookInsert = Omit<Book, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type BookUpdate = Partial<BookInsert>
export type SessionInsert = Omit<ReadingSession, 'id' | 'timestamp'>

export interface BookLookupResult {
  isbn: string
  title: string
  author: string | null
  year: number | null
  cover_url: string | null
  description: string | null
  external_rating: number | null
  external_rating_count: number | null
}

export type ReadingStatus = 'STARTED' | 'PAUSED' | 'FINISHED'
