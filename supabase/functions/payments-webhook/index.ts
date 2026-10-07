import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json, serviceClient } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  const expected = Deno.env.get('PAYMENTS_WEBHOOK_SECRET')
  const provided = req.headers.get('x-webhook-secret')
  if (!expected || provided !== expected) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const body = await req.json().catch(() => null)
  if (!body?.reservation_id || !body?.status) {
    return json({ error: 'reservation_id and status required' }, 400)
  }
  const { url, key } = serviceClient()
  const supabase = createClient(url, key)
  const { data, error } = await supabase.rpc('apply_payment_event', {
    p_reservation_id: body.reservation_id,
    p_status: body.status,
    p_provider: body.provider ?? 'webhook',
    p_provider_reference: body.provider_reference ?? null,
    p_external_id: body.external_id ?? null,
    p_amount_xaf: body.amount_xaf ?? null,
    p_failure_reason: body.failure_reason ?? null,
  })
  if (error) return json({ error: error.message }, 400)
  if (data?.generate_documents) {
    await fetch(`${url}/functions/v1/generate-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: body.reservation_id }),
    }).catch(() => undefined)
  }
  return json({ ok: true, data })
})
