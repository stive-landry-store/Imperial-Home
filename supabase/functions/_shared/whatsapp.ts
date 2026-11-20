// Imperial Home — WhatsApp Business Cloud API.
// Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, optional WHATSAPP_TEMPLATE_CONFIRMED / WHATSAPP_TEMPLATE_REMINDER
// (approved templates with body parameters, language WHATSAPP_TEMPLATE_LANG, default "fr").
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

export function whatsappReady(): boolean {
  return Boolean(Deno.env.get('WHATSAPP_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'))
}

/** Cameroon numbers without a country code get +237. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 9) return `237${digits}`
  return digits.length >= 10 ? digits : null
}

export async function sendWhatsApp(input: {
  to: string | null | undefined
  template?: string | null
  params?: string[]
  text: string
}): Promise<boolean> {
  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const to = normalizePhone(input.to)
  if (!token || !phoneId || !to) return false
  const body = input.template
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: input.template,
          language: { code: Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'fr' },
          components: [{ type: 'body', parameters: (input.params ?? []).map((text) => ({ type: 'text', text })) }],
        },
      }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: input.text.slice(0, 4000) } }
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return response.ok
  } catch {
    return false
  }
}
