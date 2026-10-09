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
  const password = String(body?.password ?? "")
  const fullName = String(body?.full_name ?? "").trim().slice(0, 120)
  const phone = String(body?.phone ?? "").trim().slice(0, 30)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return json({ error: "Enter a valid email address." }, 400)
  }
  if (password.length < 8 || password.length > 72) {
    return json({ error: "Password should be at least 8 characters." }, 400)
  }
  if (fullName.length < 2) return json({ error: "Enter your name." }, 400)
  if (phone && !/^[0-9+\s().-]{6,30}$/.test(phone)) return json({ error: "Enter a valid phone number." }, 400)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceKey) return json({ error: "Could not create the account." }, 500)

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone || null },
    }),
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    const message = String(detail?.msg || detail?.message || detail?.error_description || "")
    if (response.status === 422 || /already|exists|registered/i.test(message)) {
      return json({ error: "User already registered" }, 409)
    }
    return json({ error: "Could not create the account." }, 400)
  }

  return json({ ok: true })
})
