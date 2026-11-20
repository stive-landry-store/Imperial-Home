import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { handleCors, json, serviceClient, underRateLimit } from '../_shared/http.ts'

// Imperial Home reception assistant, grounded on the house data and answered by Claude.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

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
  if (!(await underRateLimit(`assistant:${userData.user.id}`, 30, 3600))) {
    return json({ error: 'Too many messages. Try again in a moment.' }, 429)
  }

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

  const q = String(message).toLowerCase()
  const fr = /[àâçéèêëîïôùûü]|\b(bonjour|salut|prix|appartement|reservation|réserv|disponible|voiture|wifi|nuit|séjour)\b/i.test(String(message))
  const phone = cfg.phone || '+237 674 09 22 63'
  let answer = fr
    ? 'Je passe votre message à la réception.'
    : 'I’ll pass your message to reception.'
  let escalate = false
  if (/human|person|agent|whatsapp|parler|quelqu/.test(q)) {
    escalate = true
    answer = fr
      ? `Bien sûr. Écrivez ici, ou sur WhatsApp au ${phone}. Quelqu’un de la maison vous répond.`
      : `Of course. Write here, or on WhatsApp at ${phone}. Someone from the house will reply.`
  } else if (/voiture|car|chauffeur|driver/.test(q)) {
    answer = fr
      ? 'Oui, la voiture se réserve seule. Ouvrez Location voiture, choisissez le modèle et les dates.'
      : 'Yes, the car can be booked on its own. Open Car rental and choose the car and the dates.'
  } else if (/book|reserv|available|disponib|calendrier/.test(q)) {
    answer = fr
      ? 'Sur la fiche de l’appartement, choisissez le jour d’arrivée et le nombre de nuits. Si c’est libre, la demande part.'
      : 'On the apartment page, choose the arrival day and the number of nights. If it’s free, the request goes through.'
  } else if (/price|tarif|prix|xaf/.test(q)) {
    const list = (properties ?? []).map((p) => `${p.name} : ${p.nightly_rate_xaf} FCFA la nuit`).join('\n')
    answer = fr ? `Les prix à la nuit :\n${list}` : `Nightly prices:\n${list}`
  } else if (/wifi|wi-fi|arrivée|depart|départ/.test(q)) {
    answer = fr
      ? 'Le mot de passe Wi-Fi est dans l’appartement, une fois le séjour confirmé. Arrivée vers 14 h, départ vers 11 h.'
      : 'The Wi-Fi password is in the apartment once the stay is confirmed. Arrival around 2 pm, departure around 11 am.'
  } else {
    const match = (properties ?? []).find(
      (p) => q.includes(String(p.name).toLowerCase()) || q.includes(String(p.neighborhood ?? '').toLowerCase()),
    )
    if (match) {
      answer = fr
        ? `${match.name}, à ${match.city}. ${match.capacity} personnes, ${match.nightly_rate_xaf} FCFA la nuit.`
        : `${match.name}, in ${match.city}. ${match.capacity} people, ${match.nightly_rate_xaf} FCFA a night.`
    } else if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      escalate = true
    }
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (anthropicKey && !escalate) {
    const { data: history } = await admin
      .from('messages')
      .select('role, body')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(12)
    const turns: Anthropic.Beta.BetaMessageParam[] = []
    for (const row of (history ?? []).reverse()) {
      const role = row.role === 'customer' || row.role === 'user' ? 'user' : 'assistant'
      const text = String(row.body ?? '').slice(0, 2000)
      if (!text) continue
      const last = turns[turns.length - 1]
      if (last && last.role === role) last.content = `${last.content}\n${text}`
      else turns.push({ role, content: text })
    }
    while (turns.length && turns[0].role !== 'user') turns.shift()
    const question = `FACTS (JSON, the only source of truth):\n${facts}\n\nGUEST MESSAGE:\n${message}`
    if (turns.length && turns[turns.length - 1].role === 'user') turns[turns.length - 1].content = question
    else turns.push({ role: 'user', content: question })

    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      const response = await client.beta.messages.create({
        model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5-5',
        max_tokens: 1024,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system:
          'You are the reception desk of Imperial Home, furnished apartments at Carrefour Conquête, Douala. Reply in the guest\'s language, in two to four short sentences, warm and plain. Use ONLY the FACTS. Never invent availability, prices, or reservation status. When you do not know, say you are passing the question to the team. Currency is FCFA.',
        messages: turns,
      })
      if (response.stop_reason !== 'refusal') {
        const text = response.content
          .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('')
          .trim()
        if (text) answer = text
      } else {
        escalate = true
      }
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) console.warn('assistant rate limited')
      else if (error instanceof Anthropic.APIError) console.error('assistant api error', error.status)
      else console.error('assistant error', error)
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
