// Imperial Home — Web Push delivery (called by the database through pg_net).
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import webpush from 'web-push'
import { anonClient, readJson, serviceClient } from './_lib/env.js'

const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:imperialhome237@gmail.com'

async function publicKey(service, anon) {
  const current = await (service || anon).rpc('push_public_key')
  if (current.data) return current.data
  if (!service) return null
  const keys = webpush.generateVAPIDKeys()
  const created = await service.rpc('init_push_keys', { p_public: keys.publicKey, p_private: keys.privateKey })
  return created.data || null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const service = serviceClient()
  const anon = anonClient()
  if (!service && !anon) return res.status(500).json({ error: 'not configured' })

  if (req.method === 'GET') {
    const key = await publicKey(service, anon)
    return key ? res.status(200).json({ publicKey: key }) : res.status(503).json({ error: 'no key' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  if (!service) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' })
  const body = readJson(req)
  if (!body) return res.status(400).json({ error: 'json' })
  const id = typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'id' })

  const claimed = await service.rpc('claim_push', { p_id: id })
  const job = claimed.data
  if (!job) return res.status(200).json({ sent: 0 })

  webpush.setVapidDetails(SUBJECT, job.publicKey, job.privateKey)
  const payload = JSON.stringify({ title: job.title, body: job.body, link: job.link, tag: 'imperial-home' })
  const list = Array.isArray(job.subscriptions) ? job.subscriptions : []
  let sent = 0
  await Promise.all(
    list.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload, { TTL: 86400, urgency: 'high' })
        sent += 1
      } catch (error) {
        if (error && (error.statusCode === 404 || error.statusCode === 410)) {
          await service.rpc('drop_push_endpoint', { p_id: id, p_endpoint: item.endpoint })
        }
      }
    }),
  )
  return res.status(200).json({ sent })
}
