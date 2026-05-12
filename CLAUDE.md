# Bookmark – Personal Reading Diary

## What it is
A PWA app for home readers. Works as an installed app on Android (Chrome → Add to home screen). Data is stored in Supabase cloud — accessible from both phone and laptop, with backups.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 + Vite + TypeScript |
| PWA | vite-plugin-pwa |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Styling | Tailwind CSS v3 |
| Icons | @heroicons/vue |
| i18n | vue-i18n v9 (English / Czech) |
| Barcode scanning | BarcodeDetector API (native in Chrome/Android) |
| Book metadata | Open Library API (primary) + Google Books API (fallback) |

## Deployment
- Frontend hosting: **Netlify** or **GitHub Pages** (free, static build)
- Database: **Supabase** free tier (500MB, free)
- Supabase project pauses after 7 days of inactivity → solution: cron-job.org ping every 3 days

## Project structure

```
bookmark/
  src/
    i18n/
      index.ts            # i18n setup + setLocale / getLocale helpers
      locales/
        en.ts             # English strings
        cs.ts             # Czech strings
    lib/
      supabase.ts         # Supabase client
      bookApi.ts          # Open Library + Google Books integration
    types/
      index.ts            # TypeScript types (Book, ReadingSession, ...)
    router/
      index.ts            # Vue Router (auth guard)
    stores/
      books.ts            # Pinia store – book CRUD
      sessions.ts         # Pinia store – reading sessions
    views/
      LoginView.vue       # Login screen
      DashboardView.vue   # Overview, books in progress
      LibraryView.vue     # Book list, search, export/import
      BookDetailView.vue  # Book detail, rating, reading history
      ScanView.vue        # Barcode scanning with camera
      AddBookView.vue     # Manual book entry
    components/
      BookCard.vue        # Book card for list views
      StarRating.vue      # Star rating (1–5)
      BarcodeScanner.vue  # Camera + BarcodeDetector
  supabase/
    schema.sql            # SQL schema – run in Supabase SQL editor
  public/
    icons/                # PWA icons (192px, 512px) – must be provided
  .env.example            # Template for .env
```

## Database schema

### Table `books`
```
id           UUID PK
user_id      UUID FK → auth.users
isbn         TEXT (nullable, unique per user)
title        TEXT NOT NULL
author       TEXT
year         INTEGER
cover_url    TEXT
location     TEXT  ("shelf A", "bedroom"...)
my_rating    INTEGER 1–5
notes        TEXT
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### Table `reading_sessions`
```
id           UUID PK
book_id      UUID FK → books.id (CASCADE DELETE)
status       TEXT  'STARTED' | 'PAUSED' | 'FINISHED'
page_number  INTEGER (nullable)
timestamp    TIMESTAMPTZ
notes        TEXT
```

## API endpoints (Supabase – called directly from Vue via SDK)

| Operation | Description |
|---|---|
| `books` SELECT | List books for the logged-in user |
| `books` INSERT | Add a new book |
| `books` UPDATE | Edit book (rating, location...) |
| `books` DELETE | Delete book (cascades to sessions) |
| `reading_sessions` SELECT | Reading history for a book |
| `reading_sessions` INSERT | Add a reading action (start/pause/finish) |

## Main screens

### Login (`/login`)
- Email + password via Supabase Auth
- Language toggle (EN/CS) on the login screen
- Redirect to dashboard after login

### Dashboard (`/`)
- Books in progress (latest status = STARTED or PAUSED)
- Quick scan button

### Library (`/library`)
- Full book list with search (title, author, location)
- JSON / CSV export in menu
- JSON import

### Book detail (`/book/:id`)
- Metadata (title, author, year, cover)
- My rating (stars), location, notes – editable inline
- Buttons: **Start reading** / **Pause reading** (+ page) / **Finish reading**
- Timeline of all sessions (date, time, page)

### Scan (`/scan`)
- Fullscreen camera, BarcodeDetector API
- After ISBN detection: checks DB → if exists, opens detail; if not, fetches metadata from API and offers to save

### Add manually (`/add`)
- Form: title*, author, year, ISBN, location, rating, notes

## i18n

Language can be switched at any time via the globe button (🌐) in the bottom navigation bar, or via the CS/EN toggle on the login screen. The selected language is saved in `localStorage`.

Adding a new language: add a file in `src/i18n/locales/`, register it in `src/i18n/index.ts`, and add a case to `setLocale`.

## External API integration

### Open Library (primary, no key required)
```
GET https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
```

### Google Books (fallback, no key for basic use)
```
GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
```

## Project setup

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example → .env and fill in Supabase credentials
cp .env.example .env

# 3. Run supabase/schema.sql in the Supabase SQL Editor

# 4. Dev server
npm run dev

# 5. Production build (for Netlify/GitHub Pages)
npm run build
```

## Supabase setup (one-time)
1. Create an account at supabase.com (free)
2. New Project → note the URL and anon key
3. SQL Editor → run `supabase/schema.sql`
4. Authentication → Email/Password enabled (default)
5. Create your account via Sign Up in the app

## PWA icons
Files `public/icons/icon-192.png` and `public/icons/icon-512.png` must be provided.
Generator: https://favicon.io or https://realfavicongenerator.net

## Planned extensions (backlog)
- Offline support (Service Worker cache for reading without internet)
- Reading statistics (books per year, average speed...)
- Labels / tags
- Turso sync (when it leaves BETA) for offline-first
- Dark mode
- Family profiles (multiple users)
