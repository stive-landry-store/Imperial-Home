import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { handleCors, json, serviceClient } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  const { reservation_id } = await req.json().catch(() => ({ reservation_id: null }))
  if (!reservation_id) return json({ error: 'reservation_id required' }, 400)

  const { url, key } = serviceClient()
  const supabase = createClient(url, key)
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select('*, properties (*), profiles:customer_id (*), payments (*)')
    .eq('id', reservation_id)
    .single()
  if (error || !reservation) return json({ error: 'Reservation not found' }, 404)
  if (reservation.status !== 'confirmed' && reservation.status !== 'completed') {
    return json({ error: 'Documents generate only after confirmed payment' }, 400)
  }

  const { data: secrets } = await supabase
    .from('property_welcome_secrets')
    .select('*')
    .eq('property_id', reservation.property_id)
    .maybeSingle()

  const { data: configRows } = await supabase.from('system_config').select('key, value')
  const cfg = Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value]))
  const phone = String(cfg.phone ?? '+237 674 09 22 63')
  const email = String(cfg.email ?? 'imperialhome237@gmail.com')

  const property = reservation.properties
  const customer = reservation.profiles
  const payment = reservation.payments?.[0]

  const housing = await makePdf([
    'IMPERIAL HOME — Housing Sheet',
    `Reservation ${reservation.public_code}`,
    `Guest: ${customer?.full_name ?? ''} · ${customer?.email ?? ''} · ${customer?.phone ?? ''}`,
    `Property: ${property?.name ?? ''} — ${property?.address ?? ''}, ${property?.city ?? ''}`,
    `Stay: ${reservation.check_in} → ${reservation.check_out} · ${reservation.guest_count} guests · ${reservation.nights} nights`,
    `Amount: ${reservation.total_amount_xaf} XAF · Payment: ${payment?.status ?? 'unknown'}`,
    `Check-in ${property?.check_in_time ?? '14:00'} · Check-out ${property?.check_out_time ?? '11:00'}`,
    `Contact: ${phone} · ${email}`,
  ])

  const welcome = await makePdf([
    'IMPERIAL HOME — Welcome Book',
    property?.welcome_message_en ?? `Welcome to ${property?.name ?? 'Imperial Home'}.`,
    `Residence: ${property?.name ?? ''}`,
    `Address: ${property?.address ?? ''}, ${property?.neighborhood ?? ''}, ${property?.city ?? ''}`,
    `Wi-Fi: ${secrets?.wifi_name ?? 'Provided after confirmation'} / ${secrets?.wifi_password ?? ''}`,
    `Access: ${secrets?.access_notes ?? ''}`,
    `House rules: ${property?.rules_en ?? ''}`,
    `Safety: ${property?.safety_info_en ?? ''}`,
    `Equipment: ${property?.equipment_instructions_en ?? ''}`,
    `Kitchen: ${property?.kitchen_info_en ?? ''}`,
    `Recommendations: ${property?.recommendations_en ?? ''}`,
    `Concierge: ${phone} · ${email} · WhatsApp +237 674 09 22 63`,
  ])

  const customerFolder = reservation.customer_id
  const housingPath = `${customerFolder}/${reservation.id}/housing-sheet.pdf`
  const welcomePath = `${customerFolder}/${reservation.id}/welcome-book.pdf`

  await supabase.storage.from('documents').upload(housingPath, housing, { contentType: 'application/pdf', upsert: true })
  await supabase.storage.from('documents').upload(welcomePath, welcome, { contentType: 'application/pdf', upsert: true })

  await supabase.from('documents').upsert(
    [
      { reservation_id, document_type: 'housing_sheet', storage_path: housingPath },
      { reservation_id, document_type: 'welcome_book', storage_path: welcomePath },
    ],
    { onConflict: 'reservation_id,document_type' },
  )

  return json({ ok: true, housing_path: housingPath, welcome_path: welcomePath })
})

async function makePdf(lines: string[]) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  let page = doc.addPage([595, 842])
  let y = 780
  const gold = rgb(0.79, 0.64, 0.15)
  const ink = rgb(0.05, 0.05, 0.05)
  page.drawRectangle({ x: 40, y: 800, width: 515, height: 2, color: gold })
  for (const line of lines) {
    const chunks = wrap(line, 88)
    for (const chunk of chunks) {
      if (y < 60) {
        page = doc.addPage([595, 842])
        y = 780
      }
      page.drawText(chunk, { x: 50, y, size: 12, font, color: ink })
      y -= 18
    }
    y -= 8
  }
  return await doc.save()
}

function wrap(text: string, width: number) {
  const words = (text || '—').split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > width) {
      if (cur) lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}
