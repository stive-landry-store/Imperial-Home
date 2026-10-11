import { createClient } from '@supabase/supabase-js'

const ORIGIN = 'https://imperial-home.vercel.app'

const PAGES = ['/', '/properties', '/properties/map', '/cars', '/contact']

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function urlEntry(path) {
  return `  <url><loc>${escapeXml(ORIGIN + path)}</loc></url>`
}

export default async function handler(_req, res) {
  const paths = [...PAGES]
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const [{ data: properties }, { data: vehicles }] = await Promise.all([
      supabase.from('properties').select('slug').eq('status', 'published'),
      supabase.from('vehicles').select('slug').eq('status', 'published'),
    ])
    for (const row of properties ?? []) {
      if (row.slug) paths.push(`/properties/${encodeURIComponent(row.slug)}`)
    }
    for (const row of vehicles ?? []) {
      if (row.slug) paths.push(`/cars/${encodeURIComponent(row.slug)}`)
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(urlEntry).join('\n')}
</urlset>
`
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
