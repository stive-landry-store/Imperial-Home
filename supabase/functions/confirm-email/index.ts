import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return json({ error: "Enter a valid email address." }, 400)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceKey) return json({ error: "Could not confirm the account." }, 500)

  let userId = ""
  for (let page = 1; page <= 5 && !userId; page += 1) {
    const listed = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
    if (!listed.ok) return json({ error: "Could not confirm the account." }, 400)
    const payload = await listed.json().catch(() => null) as { users?: { id: string; email?: string }[] } | null
    const users = payload?.users ?? []
    userId = users.find((item) => item.email?.toLowerCase() === email)?.id ?? ""
    if (users.length < 200) break
  }
  if (!userId) return json({ ok: true })

  const confirmed = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_confirm: true }),
  })
  if (!confirmed.ok) return json({ error: "Could not confirm the account." }, 400)
  return json({ ok: true })
})
