// Imperial Home — iCal export feed for one apartment (Airbnb / Booking import this URL).
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import { anonClient } from './_lib/env.js'

export default async function handler(req, res) {
  const token = new URL(req.url, 'https://imperial-home.local').searchParams.get('token')
  const supabase = anonClient()
  if (!token || !supabase) {
    res.status(404).end('Not found')
    return
  }
  const { data, error } = await supabase.rpc('ical_feed', { p_token: token })
  if (error || typeof data !== 'string') {
    res.status(404).end('Not found')
    return
  }
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).send(data)
}
