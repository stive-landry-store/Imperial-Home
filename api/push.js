import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:imperialhome237@gmail.com'

function db() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

async function publicKey(supabase) {
  const current = await supabase.rpc('push_public_key')
  if (current.data) return current.data
  const keys = webpush.generateVAPIDKeys()
  const created = await supabase.rpc('init_push_keys', { p_public: keys.publicKey, p_private: keys.privateKey })
  return created.data || null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const supabase = db()
  if (!supabase) return res.status(500).json({ error: 'not configured' })

  if (req.method === 'GET') {
    const key = await publicKey(supabase)
    return key ? res.status(200).json({ publicKey: key }) : res.status(503).json({ error: 'no key' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const id = typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'id' })

  const claimed = await supabase.rpc('claim_push', { p_id: id })
  const job = claimed.data
  if (!job) return res.status(200).json({ sent: 0 })

  webpush.setVapidDetails(SUBJECT, job.publicKey, job.privateKey)
  const payload = JSON.stringify({ title: job.title, body: job.body, link: job.link, tag: `${job.title}|${job.link}` })
  let sent = 0
  await Promise.all(
    job.subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload, { TTL: 86400, urgency: 'high' })
        sent += 1
      } catch (error) {
        if (error && (error.statusCode === 404 || error.statusCode === 410)) {
          await supabase.rpc('drop_push_endpoint', { p_id: id, p_endpoint: item.endpoint })
        }
      }
    }),
  )
  return res.status(200).json({ sent })
}
