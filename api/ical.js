import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const token = new URL(req.url, 'https://imperial-home.vercel.app').searchParams.get('token')
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !key) {
    res.status(404).end('Not found')
    return
  }
  const supabase = createClient(url, key)
  const { data, error } = await supabase.rpc('ical_feed', { p_token: token })
  if (error || typeof data !== 'string') {
    res.status(404).end('Not found')
    return
  }
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).send(data)
}
