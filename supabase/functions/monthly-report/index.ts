// Imperial Home — monthly accounting report (run on the 1st of each month).
// E-mails last month's stays, revenue and car rentals as CSV to the house address.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { authorizedCron } from "../_shared/cron.ts"
import { json, serviceClient } from "../_shared/http.ts"

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`

Deno.serve(async (req) => {
  if (!authorizedCron(req)) return json({ error: "Unauthorized" }, 401)
  const { url, key } = serviceClient()
  const db = createClient(url, key, { auth: { persistSession: false } })
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)

  const { data: stays, error } = await db
    .from("reservations")
    .select("public_code, status, check_in, check_out, guest_count, base_amount_xaf, discount_xaf, total_amount_xaf, created_at, properties ( name ), profiles:customer_id ( full_name, email, phone )")
    .gte("check_in", start)
    .lt("check_in", end)
    .order("check_in")
  if (error) return json({ error: error.message }, 500)

  const header = ["Code", "Statut", "Appartement", "Client", "E-mail", "Téléphone", "Arrivée", "Départ", "Voyageurs", "Base XAF", "Remise XAF", "Total XAF"]
  const rows = (stays ?? []).map((s: Record<string, any>) => [
    s.public_code, s.status, s.properties?.name, s.profiles?.full_name, s.profiles?.email, s.profiles?.phone,
    s.check_in, s.check_out, s.guest_count, s.base_amount_xaf, s.discount_xaf, s.total_amount_xaf,
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")
  const confirmed = (stays ?? []).filter((s: Record<string, any>) => s.status === "confirmed" || s.status === "completed")
  const revenue = confirmed.reduce((sum: number, s: Record<string, any>) => sum + Number(s.total_amount_xaf ?? 0), 0)

  const apiKey = Deno.env.get("RESEND_API_KEY")
  const to = Deno.env.get("REPORT_EMAIL") ?? "imperialhome237@gmail.com"
  let sent = false
  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") ?? "Imperial Home <onboarding@resend.dev>",
        to: [to],
        subject: `Imperial Home — rapport ${start.slice(0, 7)}`,
        text: `Séjours : ${(stays ?? []).length}\nConfirmés : ${confirmed.length}\nChiffre d'affaires : ${revenue.toLocaleString("fr-FR")} FCFA\n\nLe détail est en pièce jointe (CSV, séparateur ;).`,
        attachments: [{ filename: `imperial-home-${start.slice(0, 7)}.csv`, content: btoa(unescape(encodeURIComponent("﻿" + csv))) }],
      }),
    })
    sent = response.ok
  }
  return json({ month: start.slice(0, 7), stays: (stays ?? []).length, confirmed: confirmed.length, revenue, sent })
})
