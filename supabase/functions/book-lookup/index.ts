import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let isbn: string
  try {
    const body = await req.json()
    isbn = String(body.isbn ?? '').replace(/[^0-9X]/gi, '')
  } catch {
    return new Response(JSON.stringify(null), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  if (!isbn) return new Response(JSON.stringify(null), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  const result = await lookupDatabazeknih(isbn)
  return new Response(JSON.stringify(result), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})

async function lookupDatabazeknih(isbn: string) {
  const url = `https://www.databazeknih.cz/vyhledavani/knihy?q=${encodeURIComponent(isbn)}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookmarkApp/1.0; +https://github.com/DaveProkop/Bookmark)' },
      redirect: 'follow',
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  // If the ISBN search redirected to a book detail page we have an exact match.
  // If it stayed on the search results page, the ISBN is not in the database.
  const finalUrl = res.url
  if (!finalUrl.includes('/prehled-knihy/') && !finalUrl.includes('/book/')) {
    return null
  }

  const html = await res.text()

  const title = extractMeta(html, 'og:title')
  if (!title) return null

  const coverUrl = extractMeta(html, 'og:image') ?? null

  // Author appears as:  author: 'Shain Rose',
  const authorMatch = html.match(/\bauthor:\s*'([^']+)'/)
  const author = authorMatch?.[1] ?? null

  // Year appears as: <em class='year'>2024</em>
  const yearMatch = html.match(/<em class=['"]year['"]>(\d{4})<\/em>/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null

  // Short description from og:description
  const description = extractMeta(html, 'og:description') ?? null

  return { isbn, title, author, year, cover_url: coverUrl, description, external_rating: null, external_rating_count: null }
}

function extractMeta(html: string, property: string): string | undefined {
  const m = html.match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]+)"`))
    ?? html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="${property}"`))
  return m?.[1]
}
