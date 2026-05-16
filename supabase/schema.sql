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
  total_pages INTEGER,
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

-- Štítky
CREATE TABLE IF NOT EXISTS tags (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Vazba kniha–štítek
CREATE TABLE IF NOT EXISTS book_tags (
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

-- Přečtení knihy
CREATE TABLE IF NOT EXISTS book_completions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  finished_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_user          ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_book       ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_sessions_time       ON reading_sessions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tags_user           ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_book      ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag       ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_completions_book    ON book_completions(book_id);
CREATE INDEX IF NOT EXISTS idx_completions_user    ON book_completions(user_id, finished_at DESC);

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
ALTER TABLE tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_completions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books_owner" ON books;
CREATE POLICY "books_owner" ON books
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_owner" ON reading_sessions;
CREATE POLICY "sessions_owner" ON reading_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM books WHERE books.id = reading_sessions.book_id AND books.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tags_owner" ON tags;
CREATE POLICY "tags_owner" ON tags
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "book_tags_owner" ON book_tags;
CREATE POLICY "book_tags_owner" ON book_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM books WHERE books.id = book_tags.book_id AND books.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "completions_owner" ON book_completions;
CREATE POLICY "completions_owner" ON book_completions
  FOR ALL USING (auth.uid() = user_id);
