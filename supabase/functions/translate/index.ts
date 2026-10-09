import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const ALLOWED = new Set(["en", "zh-CN", "zh", "hi", "es", "fr", "de", "ar", "bn", "pt", "ru", "ur"])

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS })

  const body = await req.json().catch(() => null)
  const texts = Array.isArray(body?.texts) ? body.texts.slice(0, 16).map((item: unknown) => String(item).slice(0, 450)) : []
  const source = ALLOWED.has(body?.source) ? String(body.source) : "en"
  const target = ALLOWED.has(body?.target) ? String(body.target) : "en"
  const translated: string[] = []

  for (const text of texts) {
    if (!text.trim() || source === target) {
      translated.push(text)
      continue
    }
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
      const response = await fetch(url)
      if (!response.ok) {
        translated.push(text)
        continue
      }
      const data = await response.json()
      translated.push(data[0].map((part: string[]) => part[0]).join(""))
    } catch {
      translated.push(text)
    }
  }

  return new Response(JSON.stringify({ texts: translated }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  })
})
