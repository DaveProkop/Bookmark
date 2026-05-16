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

  // ISBN search redirects to detail page on exact match
  const finalUrl = res.url
  if (!finalUrl.includes('/prehled-knihy/') && !finalUrl.includes('/book/')) {
    return null
  }

  const html = await res.text()

  const title = extractMeta(html, 'og:title')
  if (!title) return null

  const coverUrl = extractMeta(html, 'og:image') ?? null
  const author = html.match(/\bauthor:\s*'([^']+)'/)?.[1] ?? null
  const yearMatch = html.match(/<em class=['"]year['"]>(\d{4})<\/em>/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null
  const description = extractMeta(html, 'og:description') ?? null

  // Page count: "Počet stran: 352" or JSON-LD numberOfPages
  let totalPages: number | null = null
  const pagesMatch = html.match(/Počet\s+stran[^0-9]*(\d{2,4})/)
    ?? html.match(/numberOfPages["']?\s*[>:]\s*["']?(\d{2,4})/)
  if (pagesMatch) {
    const n = parseInt(pagesMatch[1])
    if (n > 9 && n < 9000) totalPages = n
  }
  if (!totalPages) {
    const ldMatch = html.match(/"numberOfPages"\s*:\s*(\d+)/)
    if (ldMatch) {
      const n = parseInt(ldMatch[1])
      if (n > 9 && n < 9000) totalPages = n
    }
  }

  return { isbn, title, author, year, total_pages: totalPages, cover_url: coverUrl, description, external_rating: null, external_rating_count: null }
}

function extractMeta(html: string, property: string): string | undefined {
  const m = html.match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]+)"`))
    ?? html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="${property}"`))
  return m?.[1]
}
