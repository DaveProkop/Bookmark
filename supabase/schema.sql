-- ============================================================
-- Bookmark – Supabase schema
-- Spusť celý tento soubor v Supabase → SQL Editor → New query
-- ============================================================

-- Books
CREATE TABLE IF NOT EXISTS books (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isbn        TEXT,
  title       TEXT NOT NULL,
  author      TEXT,
  year        INTEGER,
  cover_url   TEXT,
  location    TEXT,
  my_rating   INTEGER CHECK (my_rating BETWEEN 1 AND 5),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, isbn)
);

-- Reading sessions
CREATE TABLE IF NOT EXISTS reading_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('STARTED', 'PAUSED', 'FINISHED')),
  page_number INTEGER,
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_user    ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_book ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON reading_sessions(timestamp DESC);

-- Auto-update updated_at on books
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security – každý vidí jen své vlastní knihy
-- ============================================================
ALTER TABLE books             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions  ENABLE ROW LEVEL SECURITY;

-- Books: full access pro vlastníka
DROP POLICY IF EXISTS "books_owner" ON books;
CREATE POLICY "books_owner" ON books
  FOR ALL USING (auth.uid() = user_id);

-- Sessions: přístup přes vlastnictví knihy
DROP POLICY IF EXISTS "sessions_owner" ON reading_sessions;
CREATE POLICY "sessions_owner" ON reading_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM books WHERE books.id = reading_sessions.book_id
        AND books.user_id = auth.uid()
    )
  );
