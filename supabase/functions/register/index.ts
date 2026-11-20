// Imperial Home — account creation with e-mail verification, captcha and rate limit.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { clientIp, handleCors, json, serviceClient, underRateLimit, verifyCaptcha } from "../_shared/http.ts"
import { sendEmail, signupEmail } from "../_shared/email.ts"

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const ip = clientIp(req)
  if (!(await underRateLimit(`register:${ip}`, 5, 3600))) {
    return json({ error: "Too many attempts. Try again later." }, 429)
  }

  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  const password = String(body?.password ?? "")
  const fullName = String(body?.full_name ?? "").trim().slice(0, 120)
  const phone = String(body?.phone ?? "").trim().slice(0, 30)
  const redirectTo = String(body?.redirect_to ?? "").slice(0, 300)
  const locale = String(body?.locale ?? "fr").slice(0, 5)

  if (!(await verifyCaptcha(body?.captcha_token, ip))) {
    return json({ error: "Captcha check failed." }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return json({ error: "Enter a valid email address." }, 400)
  }
  if (password.length < 8 || password.length > 72) {
    return json({ error: "Password should be at least 8 characters." }, 400)
  }
  if (fullName.length < 2) return json({ error: "Enter your name." }, 400)
  if (phone && !/^[0-9+\s().-]{6,30}$/.test(phone)) return json({ error: "Enter a valid phone number." }, 400)

  const { url, key } = serviceClient()
  if (!url || !key) return json({ error: "Could not create the account." }, 500)
  const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" }

  // The account is created UNCONFIRMED. Admin rights are only granted once the address is verified.
  const linked = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "signup",
      email,
      password,
      data: { full_name: fullName, phone: phone || null },
      redirect_to: redirectTo || undefined,
    }),
  })

  if (!linked.ok) {
    const detail = await linked.json().catch(() => null)
    const message = String(detail?.msg || detail?.message || detail?.error_description || "")
    if (linked.status === 422 || /already|exists|registered/i.test(message)) {
      return json({ error: "User already registered" }, 409)
    }
    return json({ error: "Could not create the account." }, 400)
  }

  const payload = await linked.json().catch(() => null)
  const actionLink = String(payload?.action_link ?? payload?.properties?.action_link ?? "")

  // Send through Resend when configured, otherwise through Supabase's own mailer.
  const mail = actionLink ? signupEmail({ name: fullName, link: actionLink, locale }) : null
  const sent = mail ? await sendEmail({ to: email, ...mail }) : false
  if (!sent) {
    await fetch(`${url}/auth/v1/resend`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "signup", email, options: { email_redirect_to: redirectTo || undefined } }),
    }).catch(() => undefined)
  }

  return json({ ok: true, needs_confirmation: true })
})
