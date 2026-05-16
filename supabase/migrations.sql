-- ============================================================
-- Bookmark – migrace pro existující databázi
-- Spusť v Supabase → SQL Editor → New query
-- ============================================================

-- Přidat počet stran ke knihám
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_pages INTEGER;

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

-- Přečtení knihy (statistiky)
CREATE TABLE IF NOT EXISTS book_completions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  finished_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_tags_user          ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_book      ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag       ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_completions_book    ON book_completions(book_id);
CREATE INDEX IF NOT EXISTS idx_completions_user    ON book_completions(user_id, finished_at DESC);

-- RLS
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_completions ENABLE ROW LEVEL SECURITY;

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
