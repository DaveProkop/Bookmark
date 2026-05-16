import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UA = 'Mozilla/5.0 (compatible; BookmarkApp/1.0; +https://github.com/DaveProkop/Bookmark)'

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

  const result = await lookupCbdb(isbn)
  return new Response(JSON.stringify(result), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})

async function lookupCbdb(isbn: string) {
  // Step 1: AJAX search by ISBN → get book ID
  let searchRes: Response
  try {
    searchRes = await fetch(`https://www.cbdb.cz/ajax_server/search.php?word=${encodeURIComponent(isbn)}`, {
      headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest' },
    })
  } catch {
    return null
  }
  if (!searchRes.ok) return null

  let searchData: { books?: Array<{ id: string; name: string; authors: string }> }
  try {
    searchData = await searchRes.json()
  } catch {
    return null
  }

  const firstBook = searchData.books?.[0]
  if (!firstBook?.id) return null

  // Step 2: fetch book detail page
  let detailRes: Response
  try {
    detailRes = await fetch(`https://www.cbdb.cz/kniha-${firstBook.id}`, {
      headers: { 'User-Agent': UA },
    })
  } catch {
    return null
  }
  if (!detailRes.ok) return null

  const html = await detailRes.text()

  // Step 3: parse JSON-LD (most stable)
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  let ldData: Record<string, unknown> | null = null
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block[1])
      const types: string[] = Array.isArray(parsed['@type']) ? parsed['@type'] : [parsed['@type']]
      if (types.includes('Book')) { ldData = parsed; break }
    } catch { /* skip */ }
  }

  const title = (ldData?.['name'] as string | undefined) ?? firstBook.name
  if (!title) return null

  const authorsLd = ldData?.['author'] as Array<{ name: string }> | undefined
  const author = authorsLd?.[0]?.name ?? firstBook.authors?.split(',')[0]?.trim() ?? null

  const coverUrl = (ldData?.['image'] ?? ldData?.['thumbnailUrl']) as string | null ?? null

  const description = ldData?.['description'] as string | null ?? null

  const rating = ldData?.['aggregateRating'] as { ratingValue?: string; ratingCount?: string } | undefined
  const externalRating = rating?.ratingValue ? parseFloat(rating.ratingValue) : null
  const externalRatingCount = rating?.ratingCount ? parseInt(rating.ratingCount) : null

  // numberOfPages from JSON-LD
  let totalPages: number | null = ldData?.['numberOfPages'] ? parseInt(String(ldData['numberOfPages'])) : null

  // HTML fallback for page count: "Počet stran: 352" or table row variant
  if (!totalPages) {
    const pagesMatch = html.match(/Počet\s+stran[^0-9]*(\d{2,4})/)
      ?? html.match(/(\d{2,4})\s+stran/)
      ?? html.match(/pages["']?\s*[>:]\s*(\d{2,4})/)
    if (pagesMatch) {
      const n = parseInt(pagesMatch[1])
      if (n > 9 && n < 9000) totalPages = n
    }
  }

  // Year from HTML: "Nakladatelství (rok): Publisher - YYYY"
  const yearMatch = html.match(/Nakladatelstv[íi] \(rok\)[^<]*-\s*(\d{4})/)
    ?? html.match(/vydáno[^0-9]*(\d{4})/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null

  return { isbn, title, author, year, total_pages: totalPages, cover_url: coverUrl, description, external_rating: externalRating, external_rating_count: externalRatingCount }
}
