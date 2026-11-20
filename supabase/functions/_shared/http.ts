// Imperial Home — shared helpers for Edge Functions.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

const DEFAULT_ORIGINS = [
  'https://imperial-home.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
]

function allowedOrigins(): string[] {
  const extra = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const site = (Deno.env.get('SITE_URL') ?? '').trim().replace(/\/$/, '')
  return [...new Set([...DEFAULT_ORIGINS, ...extra, ...(site ? [site] : [])])]
}

/** CORS limited to the Imperial Home site (and its Vercel previews). */
export function corsFor(req: Request): Record<string, string> {
  const origin = (req.headers.get('Origin') ?? '').replace(/\/$/, '')
  const list = allowedOrigins()
  const preview = /^https:\/\/imperial-home-[a-z0-9-]+-stive-landry\.vercel\.app$/.test(origin)
  const allow = list.includes(origin) || preview ? origin : list[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    Vary: 'Origin',
  }
}

let currentCors: Record<string, string> = corsFor(new Request('https://imperial-home.vercel.app'))

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...currentCors, 'Content-Type': 'application/json' },
  })
}

export function handleCors(req: Request) {
  currentCors = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: currentCors })
  return null
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return { url, key }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    'unknown'
  )
}

/**
 * Returns true when the caller is still under the limit. Uses public.hit_rate_limit
 * (service role only). If the database call fails, the request is allowed so the site keeps working.
 */
export async function underRateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { url, key } = serviceClient()
  try {
    const response = await fetch(`${url}/rest/v1/rpc/hit_rate_limit`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds }),
    })
    if (!response.ok) return true
    return (await response.json()) !== false
  } catch {
    return true
  }
}

/** Cloudflare Turnstile check. Skipped when TURNSTILE_SECRET_KEY is not set. */
export async function verifyCaptcha(token: string | null | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return true
  if (!token) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip && ip !== 'unknown') form.append('remoteip', ip)
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
    const payload = await response.json().catch(() => null)
    return Boolean(payload?.success)
  } catch {
    return false
  }
}
