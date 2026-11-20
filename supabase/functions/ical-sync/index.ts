// Imperial Home — imports Airbnb / Booking / other iCal calendars as blocked dates (run hourly).
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { authorizedCron } from "../_shared/cron.ts"
import { json, serviceClient } from "../_shared/http.ts"

type Event = { uid: string; start: string; end: string; summary: string }

function toDate(value: string): string | null {
  const m = value.match(/(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** Minimal RFC 5545 reader: unfolds lines and keeps VEVENT UID / DTSTART / DTEND / SUMMARY. */
export function parseIcs(text: string): Event[] {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/)
  const events: Event[] = []
  let current: Partial<Event> | null = null
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {}
    else if (line === "END:VEVENT") {
      if (current?.start) {
        const start = current.start
        const end = current.end ?? new Date(Date.parse(`${start}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
        events.push({ uid: current.uid ?? `${start}-${end}`, start, end, summary: current.summary ?? "" })
      }
      current = null
    } else if (current) {
      const index = line.indexOf(":")
      if (index < 0) continue
      const name = line.slice(0, index).split(";")[0].toUpperCase()
      const value = line.slice(index + 1)
      if (name === "UID") current.uid = value
      else if (name === "DTSTART") current.start = toDate(value) ?? undefined
      else if (name === "DTEND") current.end = toDate(value) ?? undefined
      else if (name === "SUMMARY") current.summary = value.slice(0, 200)
    }
  }
  return events
}

Deno.serve(async (req) => {
  if (!authorizedCron(req)) return json({ error: "Unauthorized" }, 401)
  const { url, key } = serviceClient()
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { data: calendars, error } = await db.from("external_calendars").select("id, url").eq("is_active", true)
  if (error) return json({ error: error.message }, 500)

  const results: Record<string, number | string> = {}
  for (const cal of calendars ?? []) {
    try {
      const response = await fetch(cal.url, { headers: { "User-Agent": "ImperialHome-Calendar/1.0" } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const events = parseIcs(await response.text())
      const { data: count, error: rpcError } = await db.rpc("replace_external_blocks", { p_calendar_id: cal.id, p_events: events })
      if (rpcError) throw new Error(rpcError.message)
      results[cal.id] = count ?? 0
    } catch (err) {
      const message = err instanceof Error ? err.message : "sync failed"
      results[cal.id] = message
      await db.from("external_calendars").update({ last_error: message.slice(0, 300) }).eq("id", cal.id)
    }
  }
  return json({ calendars: (calendars ?? []).length, results })
})
