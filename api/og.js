import { createClient } from '@supabase/supabase-js'

const escape = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default async function handler(req, res) {
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  const params = new URL(req.url, origin).searchParams
  const slug = params.get('slug') || ''
  const kind = params.get('kind') === 'car' ? 'cars' : 'properties'
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  let title = 'Impérial Home'
  let description = 'Appartements meublés et location de voiture à Douala'
  let image = `${origin}/icon-512.png`

  if (slug && url && key) {
    const supabase = createClient(url, key)
    if (kind === 'properties') {
      const { data } = await supabase
        .from('properties')
        .select('name, description_fr, property_images (url, is_cover, sort_order)')
        .eq('slug', slug)
        .maybeSingle()
      if (data) {
        title = `${data.name} | Impérial Home`
        description = (data.description_fr || description).slice(0, 180)
        const cover = [...(data.property_images ?? [])]
          .filter((img) => img.url)
          .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)[0]
        if (cover) image = cover.url
      }
    }
  }

  const page = `${origin}/${kind}/${encodeURIComponent(slug)}`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
  res.status(200).send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Impérial Home">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:url" content="${escape(page)}">
<meta name="twitter:card" content="summary_large_image">
</head><body><a href="${escape(page)}">${escape(title)}</a></body></html>`)
}
