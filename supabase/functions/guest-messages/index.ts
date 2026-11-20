// Imperial Home — guest messages job (run every 15 minutes).
// Sends the booking confirmation and the J-1 arrival message (access code + guide) by e-mail and WhatsApp.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { arrivalReminderEmail, bookingConfirmedEmail, sendEmail } from "../_shared/email.ts"
import { sendWhatsApp } from "../_shared/whatsapp.ts"
import { authorizedCron } from "../_shared/cron.ts"
import { json, serviceClient } from "../_shared/http.ts"

type Due = {
  kind: "confirmed" | "reminder"
  reservation_id: string
  public_code: string
  email: string | null
  phone: string | null
  full_name: string | null
  property_name: string
  check_in: string
  check_out: string
  total_amount_xaf: number | null
  access_code: string | null
  arrival_time: string | null
  guide: string | null
}

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

Deno.serve(async (req) => {
  if (!authorizedCron(req)) return json({ error: "Unauthorized" }, 401)
  const { url, key } = serviceClient()
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await db.rpc("due_guest_messages")
  if (error) return json({ error: error.message }, 500)

  let emails = 0
  let whatsapps = 0
  for (const item of (data ?? []) as Due[]) {
    const name = (item.full_name || "").split(" ")[0] || "Client"
    const base = {
      name,
      code: item.public_code,
      property: item.property_name,
      checkIn: day(item.check_in),
      checkOut: day(item.check_out),
      total: item.total_amount_xaf,
      reservationId: item.reservation_id,
    }
    const mail =
      item.kind === "confirmed"
        ? bookingConfirmedEmail(base)
        : arrivalReminderEmail({ ...base, accessCode: item.access_code, arrivalTime: item.arrival_time, guide: item.guide })
    const sentMail = item.email ? await sendEmail({ to: item.email, ...mail }) : false
    const text =
      item.kind === "confirmed"
        ? `Imperial Home : votre séjour ${item.public_code} à ${item.property_name} est confirmé, du ${base.checkIn} au ${base.checkOut}.`
        : `Imperial Home : vous arrivez demain à ${item.property_name}${item.arrival_time ? ` à partir de ${item.arrival_time}` : ""}.${item.access_code ? ` Code d'accès : ${item.access_code}.` : ""}`
    const template =
      item.kind === "confirmed" ? Deno.env.get("WHATSAPP_TEMPLATE_CONFIRMED") : Deno.env.get("WHATSAPP_TEMPLATE_REMINDER")
    const params =
      item.kind === "confirmed"
        ? [name, item.public_code, item.property_name, base.checkIn, base.checkOut]
        : [name, item.property_name, item.arrival_time ?? "14:00", item.access_code ?? "-"]
    const sentWa = await sendWhatsApp({ to: item.phone, template, params, text })

    if (sentMail) emails += 1
    if (sentWa) whatsapps += 1
    // Mark as handled even when no channel is configured, so the job never loops on the same stay.
    const now = new Date().toISOString()
    const patch: Record<string, string> =
      item.kind === "confirmed" ? { confirmation_email_sent_at: now } : { reminder_sent_at: now }
    if (sentWa) patch.whatsapp_sent_at = now
    await db.from("reservations").update(patch).eq("id", item.reservation_id)
  }
  return json({ processed: (data ?? []).length, emails, whatsapps })
})
