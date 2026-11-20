// Imperial Home — dynamic sitemap.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import { anonClient, siteOrigin } from './_lib/env.js'

const PAGES = ['/', '/properties', '/properties/map', '/cars', '/contact', '/a-propos', '/conditions', '/confidentialite', '/avis']

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const origin = siteOrigin(req)
  const paths = [...PAGES]
  const supabase = anonClient()
  if (supabase) {
    const [{ data: properties }, { data: vehicles }] = await Promise.all([
      supabase.from('properties').select('slug').eq('status', 'published'),
      supabase.from('vehicles').select('slug').eq('status', 'published'),
    ])
    for (const row of properties ?? []) if (row.slug) paths.push(`/properties/${encodeURIComponent(row.slug)}`)
    for (const row of vehicles ?? []) if (row.slug) paths.push(`/cars/${encodeURIComponent(row.slug)}`)
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${escapeXml(origin + p)}</loc></url>`).join('\n')}
</urlset>
`
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
