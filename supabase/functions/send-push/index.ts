// Sends a Web Push message for every new row in public.notifications.
// Setup (once):
//   npx web-push generate-vapid-keys
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:contact@imperial-home.app
//   supabase functions deploy send-push --no-verify-jwt
//   Database > Webhooks: on INSERT in public.notifications -> POST this function.
//   Vercel/.env: VITE_VAPID_PUBLIC_KEY=<the public key>
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

type Notification = { user_id: string; title: string; body: string | null; link: string | null }

Deno.serve(async (request) => {
  const payload = (await request.json()) as { record?: Notification }
  const record = payload.record
  if (!record) return new Response('no record', { status: 400 })

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@imperial-home.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data } = await db.from('push_subscriptions').select('endpoint, subscription').eq('user_id', record.user_id)

  const message = JSON.stringify({ title: record.title, body: record.body ?? '', link: record.link ?? '/account' })
  await Promise.all(
    (data ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, message)
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
      }
    }),
  )
  return new Response('ok')
})
