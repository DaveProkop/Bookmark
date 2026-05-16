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
  // Step 1: search by ISBN via the advanced search form (POST)
  let searchRes: Response
  try {
    searchRes = await fetch('https://www.cbdb.cz/vyhledavani', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: `type=book&isbn=${encodeURIComponent(isbn)}&ok=Vyhledat`,
    })
  } catch {
    return null
  }
  if (!searchRes.ok) return null

  const searchHtml = await searchRes.text()

  // Check for zero results early
  if (searchHtml.includes('Nalezeno odpovídajících knih: 0')) return null

  // Extract the first book link: href="kniha-XXXXX-slug"
  const linkMatch = searchHtml.match(/href="(kniha-[^"]+)"/)
  if (!linkMatch) return null

  // Step 2: fetch the book detail page
  let detailRes: Response
  try {
    detailRes = await fetch(`https://www.cbdb.cz/${linkMatch[1]}`, {
      headers: { 'User-Agent': UA },
    })
  } catch {
    return null
  }
  if (!detailRes.ok) return null

  const detailHtml = await detailRes.text()

  // Step 3: parse JSON-LD — much more stable than raw HTML scraping
  const ldBlocks = [...detailHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  let ldData: Record<string, unknown> | null = null
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block[1])
      const types: string[] = Array.isArray(parsed['@type']) ? parsed['@type'] : [parsed['@type']]
      if (types.includes('Book')) { ldData = parsed; break }
    } catch { /* skip invalid blocks */ }
  }
  if (!ldData) return null

  const title = ldData['name'] as string | undefined
  if (!title) return null

  const authors = ldData['author'] as Array<{ name: string }> | undefined
  const author = authors?.[0]?.name ?? null

  const coverUrl = (ldData['image'] ?? ldData['thumbnailUrl']) as string | null ?? null

  const description = ldData['description'] as string | null ?? null

  const rating = ldData['aggregateRating'] as { ratingValue?: string; ratingCount?: string } | undefined
  const externalRating = rating?.ratingValue ? parseFloat(rating.ratingValue) : null
  const externalRatingCount = rating?.ratingCount ? parseInt(rating.ratingCount) : null

  // Year only appears in HTML: "Nakladatelství (rok): Publisher - YYYY"
  const yearMatch = detailHtml.match(/Nakladatelstv[íi] \(rok\)[^<]*-\s*(\d{4})/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null

  return { isbn, title, author, year, cover_url: coverUrl, description, external_rating: externalRating, external_rating_count: externalRatingCount }
}
