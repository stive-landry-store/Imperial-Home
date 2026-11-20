// Imperial Home — server-rendered pages for search engines and link previews.
// Google, Bing, WhatsApp, Facebook… receive real HTML (title, description, photos, prices, JSON-LD, links)
// with the same content people see in the app.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import { anonClient, escapeHtml as esc, siteOrigin } from './_lib/env.js'

const PHONE = '+237 674 09 22 63'
const DEFAULT_DESCRIPTION =
  'Imperial Home : appartements meublés à Carrefour Conquête, Douala. Réservation en ligne et location de voiture. WhatsApp +237 674 09 22 63.'

function cover(images = []) {
  return [...images]
    .filter((img) => img.url)
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)[0]?.url
}

function page({ origin, path, title, description, image, body, jsonLd }) {
  const url = `${origin}${path}`
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="author" content="stive landry store">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Imperial Home">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head><body>
<header><a href="${esc(origin)}/">Imperial Home</a> · <a href="${esc(origin)}/properties">Appartements</a> · <a href="${esc(origin)}/cars">Location voiture</a> · <a href="${esc(origin)}/avis">Avis</a> · <a href="${esc(origin)}/contact">Contact</a></header>
<main>${body}</main>
<footer><p>Imperial Home · Carrefour Conquête, Douala · WhatsApp ${PHONE}</p><p>Application conçue par stive landry store (NYAMI TCHOUPE STIVE LANDRY).</p></footer>
</body></html>`
}

export default async function handler(req, res) {
  const origin = siteOrigin(req)
  const params = new URL(req.url, origin).searchParams
  const kind = params.get('kind') || 'property'
  const slug = params.get('slug') || ''
  const supabase = anonClient()
  let html = null

  if (supabase && kind === 'property' && slug) {
    const { data } = await supabase
      .from('properties')
      .select('id, name, slug, description_fr, nightly_rate_xaf, capacity, bedrooms, address, city, property_images (url, is_cover, sort_order)')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (data) {
      const image = cover(data.property_images) || `${origin}/icon-512.png`
      const description = (data.description_fr || DEFAULT_DESCRIPTION).slice(0, 180)
      const { data: reviews } = await supabase.rpc('public_reviews', { p_limit: 20, p_property_id: data.id })
      const list = Array.isArray(reviews) ? reviews : []
      const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
      html = page({
        origin,
        path: `/properties/${encodeURIComponent(data.slug)}`,
        title: `${data.name} | Imperial Home Douala`,
        description,
        image,
        body: `<h1>${esc(data.name)}</h1><img src="${esc(image)}" alt="${esc(data.name)}" width="800">
<p>${esc(data.description_fr || '')}</p>
<p>${esc(data.capacity)} personnes · ${esc(data.bedrooms)} chambre(s) · ${esc(Number(data.nightly_rate_xaf).toLocaleString('fr-FR'))} FCFA la nuit</p>
<p>${esc(data.address || 'Carrefour Conquête')}, ${esc(data.city || 'Douala')}</p>
${list.map((r) => `<blockquote>${'★'.repeat(r.rating)} ${esc(r.body)} — ${esc(r.guest_name)}</blockquote>`).join('')}
<p><a href="${esc(origin)}/properties/${esc(encodeURIComponent(data.slug))}/book">Réserver</a></p>`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Apartment',
          name: data.name,
          description,
          image,
          url: `${origin}/properties/${data.slug}`,
          telephone: PHONE,
          occupancy: { '@type': 'QuantitativeValue', maxValue: data.capacity },
          numberOfRooms: data.bedrooms,
          address: { '@type': 'PostalAddress', streetAddress: data.address, addressLocality: data.city || 'Douala', addressCountry: 'CM' },
          offers: { '@type': 'Offer', price: data.nightly_rate_xaf, priceCurrency: 'XAF' },
          aggregateRating: list.length
            ? { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: list.length, bestRating: 5 }
            : undefined,
        },
      })
    }
  } else if (supabase && kind === 'car' && slug) {
    const { data } = await supabase
      .from('vehicles')
      .select('brand, model, slug, description_fr, daily_rate_no_driver_xaf, vehicle_media (url, media_type, sort_order)')
      .eq('slug', slug)
      .maybeSingle()
    if (data) {
      const photo = [...(data.vehicle_media ?? [])].filter((m) => m.media_type !== 'video').sort((a, b) => a.sort_order - b.sort_order)[0]
      const image = photo?.url || `${origin}/icon-512.png`
      const title = `${data.brand} ${data.model} | Imperial Home`
      const description = (data.description_fr || 'Location de voiture à Douala').slice(0, 180)
      html = page({
        origin,
        path: `/cars/${encodeURIComponent(data.slug)}`,
        title,
        description,
        image,
        body: `<h1>${esc(data.brand)} ${esc(data.model)}</h1><img src="${esc(image)}" alt="${esc(title)}" width="800"><p>${esc(description)}</p>
<p>${esc(Number(data.daily_rate_no_driver_xaf || 0).toLocaleString('fr-FR'))} FCFA / jour</p>`,
        jsonLd: { '@context': 'https://schema.org', '@type': 'Product', name: `${data.brand} ${data.model}`, image, description },
      })
    }
  } else if (kind === 'list' || kind === 'home') {
    const { data } = supabase
      ? await supabase
          .from('properties')
          .select('name, slug, nightly_rate_xaf, capacity, property_images (url, is_cover, sort_order)')
          .eq('status', 'published')
          .order('nightly_rate_xaf')
      : { data: [] }
    const items = data ?? []
    html = page({
      origin,
      path: kind === 'home' ? '/' : '/properties',
      title: kind === 'home' ? 'Imperial Home | Appartements meublés à Douala' : 'Appartements | Imperial Home Douala',
      description: DEFAULT_DESCRIPTION,
      image: cover(items[0]?.property_images) || `${origin}/icon-512.png`,
      body: `<h1>Imperial Home — appartements meublés à Douala</h1><p>${esc(DEFAULT_DESCRIPTION)}</p><ul>${items
        .map(
          (p) =>
            `<li><a href="${esc(origin)}/properties/${esc(encodeURIComponent(p.slug))}">${esc(p.name)}</a> — ${esc(p.capacity)} personnes, ${esc(Number(p.nightly_rate_xaf).toLocaleString('fr-FR'))} FCFA la nuit</li>`,
        )
        .join('')}</ul>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name: 'Imperial Home',
        url: `${origin}/`,
        telephone: PHONE,
        address: { '@type': 'PostalAddress', streetAddress: 'Carrefour Conquête', addressLocality: 'Douala', addressCountry: 'CM' },
        geo: { '@type': 'GeoCoordinates', latitude: 4.0689, longitude: 9.7568 },
      },
    })
  }

  if (!html) {
    // Unknown slug: let the app answer (it shows its own "not found" page).
    res.setHeader('Cache-Control', 'no-store')
    res.status(404).send(page({ origin, path: '/', title: 'Imperial Home', description: DEFAULT_DESCRIPTION, image: `${origin}/icon-512.png`, body: '<h1>Page introuvable</h1>' }))
    return
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
  res.status(200).send(html)
}
