// Imperial Home — robots.txt pointing at the sitemap of the current domain.
import { siteOrigin } from './_lib/env.js'

export default function handler(req, res) {
  const origin = siteOrigin(req)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=86400')
  res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\n\nSitemap: ${origin}/sitemap.xml\n`)
}
