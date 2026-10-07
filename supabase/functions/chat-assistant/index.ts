import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json, serviceClient } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Unauthorized' }, 401)
  const { conversation_id, message } = await req.json().catch(() => ({ conversation_id: null, message: '' }))
  if (!conversation_id || !message) return json({ error: 'conversation_id and message required' }, 400)

  const { url, key } = serviceClient()
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(url, key)
  const { data: convo } = await admin.from('conversations').select('*').eq('id', conversation_id).single()
  if (!convo || convo.customer_id !== userData.user.id) return json({ error: 'Forbidden' }, 403)

  const { data: properties } = await admin
    .from('properties')
    .select('*, property_amenities ( amenities (*) )')
    .eq('status', 'published')
  const { data: reservations } = await admin
    .from('reservations')
    .select('*')
    .eq('customer_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const { data: configRows } = await admin.from('system_config').select('key, value')
  const cfg = Object.fromEntries((configRows ?? []).map((r) => [r.key, String(r.value ?? '')]))

  const facts = JSON.stringify({
    properties: (properties ?? []).map((p) => ({
      name: p.name,
      slug: p.slug,
      neighborhood: p.neighborhood,
      capacity: p.capacity,
      bedrooms: p.bedrooms,
      nightly_rate_xaf: p.nightly_rate_xaf,
      amenities: p.property_amenities,
      rules_en: p.rules_en,
    })),
    reservations,
    contact: { phone: cfg.phone, email: cfg.email },
  })

  let answer =
    'I can only answer from Imperial Home records. Use the residence calendar for availability — I will not invent dates.'
  let escalate = false
  const q = String(message).toLowerCase()
  if (/human|person|agent|whatsapp|parler/.test(q)) {
    escalate = true
    answer = `An administrator will continue. WhatsApp ${cfg.phone ?? '+237 674 09 22 63'}.`
  } else if (/book|reserv|available|disponib/.test(q)) {
    answer =
      'Availability is confirmed only in the booking calendar on each residence page. I will not invent free nights.'
  } else if (/price|tarif|xaf/.test(q)) {
    answer = (properties ?? []).map((p) => `${p.name}: ${p.nightly_rate_xaf} XAF / night`).join('\n')
  } else {
    const match = (properties ?? []).find(
      (p) => q.includes(String(p.name).toLowerCase()) || q.includes(String(p.neighborhood ?? '').toLowerCase()),
    )
    if (match) {
      answer = `${match.name} in ${match.neighborhood}, ${match.city}. Capacity ${match.capacity}. From ${match.nightly_rate_xaf} XAF / night. ${match.description_en}`
    }
  }

  const openai = Deno.env.get('OPENAI_API_KEY')
  if (openai && !escalate) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openai}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You are the Imperial Home assistant. Use ONLY the JSON facts provided. Never invent availability, prices, amenities, promotions, or reservation status. If unknown, say so and suggest WhatsApp. Currency is XAF. Company is in Douala, Cameroon.',
          },
          { role: 'user', content: `FACTS:\n${facts}\n\nQUESTION:\n${message}` },
        ],
      }),
    })
    if (res.ok) {
      const payload = await res.json()
      answer = payload.choices?.[0]?.message?.content ?? answer
    }
  }

  await admin.from('messages').insert({
    conversation_id,
    role: 'assistant',
    body: answer,
  })
  if (escalate) {
    await admin.from('conversations').update({ needs_human: true, last_message_at: new Date().toISOString() }).eq('id', conversation_id)
  } else {
    await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id)
  }
  return json({ answer, escalate })
})
