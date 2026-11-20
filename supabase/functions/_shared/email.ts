// Imperial Home — transactional e-mail through Resend (https://resend.com).
// Secrets: RESEND_API_KEY, EMAIL_FROM (e.g. "Imperial Home <reservations@imperialhome.cm>").
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

export type Mail = { subject: string; html: string; text: string }

const esc = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function siteUrl(): string {
  return (Deno.env.get('SITE_URL') ?? 'https://imperial-home.vercel.app').replace(/\/$/, '')
}

export async function sendEmail(input: Mail & { to: string; replyTo?: string }): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return false
  const from = Deno.env.get('EMAIL_FROM') ?? 'Imperial Home <onboarding@resend.dev>'
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo ?? Deno.env.get('EMAIL_REPLY_TO') ?? 'imperialhome237@gmail.com',
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

function layout(title: string, body: string, cta?: { label: string; href: string }): string {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${esc(cta.href)}" style="background:#c4a35a;color:#050505;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:13px">${esc(cta.label)}</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#050505;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#f4eee3">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111;border:1px solid rgba(196,163,90,.35);border-radius:20px;padding:36px">
<tr><td>
<p style="margin:0;font-family:Cinzel,Georgia,serif;font-size:22px;letter-spacing:.2em;color:#c4a35a">IMPERIAL HOME</p>
<h1 style="font-family:Cinzel,Georgia,serif;font-weight:500;font-size:24px;margin:22px 0 10px;color:#f4eee3">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.65;color:rgba(244,238,227,.85)">${body}</div>
${button}
<p style="margin-top:32px;font-size:12px;color:rgba(244,238,227,.5)">Imperial Home · Carrefour Conquête, Douala · WhatsApp +237 674 09 22 63</p>
</td></tr></table></td></tr></table></body></html>`
}

const fr = (locale?: string) => !locale || locale.startsWith('fr')

export function signupEmail(p: { name: string; link: string; locale?: string }): Mail {
  const f = fr(p.locale)
  const title = f ? 'Confirmez votre adresse e-mail' : 'Confirm your e-mail address'
  const intro = f
    ? `Bonjour ${esc(p.name)},<br>merci d'avoir créé votre compte Imperial Home. Cliquez sur le bouton pour confirmer votre adresse.`
    : `Hello ${esc(p.name)},<br>thank you for creating your Imperial Home account. Click the button to confirm your address.`
  return {
    subject: title,
    html: layout(title, intro, { label: f ? 'Confirmer' : 'Confirm', href: p.link }),
    text: `${title}\n\n${p.link}`,
  }
}

export type BookingMail = {
  name: string
  code: string
  property: string
  checkIn: string
  checkOut: string
  total?: number | null
  locale?: string
  reservationId?: string
}

export function bookingConfirmedEmail(p: BookingMail): Mail {
  const f = fr(p.locale)
  const title = f ? 'Votre séjour est confirmé' : 'Your stay is confirmed'
  const amount = p.total ? `${Number(p.total).toLocaleString('fr-FR')} FCFA` : ''
  const body = f
    ? `Bonjour ${esc(p.name)},<br><br><b>${esc(p.property)}</b><br>Du ${esc(p.checkIn)} au ${esc(p.checkOut)}<br>Code : <b>${esc(p.code)}</b>${amount ? `<br>Montant : ${amount}` : ''}<br><br>Votre fiche logement et votre livret d'accueil sont dans votre espace.`
    : `Hello ${esc(p.name)},<br><br><b>${esc(p.property)}</b><br>From ${esc(p.checkIn)} to ${esc(p.checkOut)}<br>Code: <b>${esc(p.code)}</b>${amount ? `<br>Amount: ${amount}` : ''}<br><br>Your housing sheet and welcome book are in your account.`
  const href = `${siteUrl()}/account${p.reservationId ? `/reservations/${p.reservationId}` : ''}`
  return { subject: `${title} · ${p.code}`, html: layout(title, body, { label: f ? 'Voir mon séjour' : 'View my stay', href }), text: `${title}\n${p.property}\n${p.checkIn} → ${p.checkOut}\n${p.code}\n${href}` }
}

export function arrivalReminderEmail(p: BookingMail & { accessCode?: string | null; arrivalTime?: string | null; guide?: string | null }): Mail {
  const f = fr(p.locale)
  const title = f ? 'Votre arrivée, c’est demain' : 'You arrive tomorrow'
  const code = p.accessCode ? `<br>${f ? "Code d'accès" : 'Access code'} : <b style="font-size:20px;letter-spacing:.2em;color:#c4a35a">${esc(p.accessCode)}</b>` : ''
  const guide = p.guide ? `<br><br>${esc(p.guide).replace(/\n/g, '<br>')}` : ''
  const body = f
    ? `Bonjour ${esc(p.name)},<br><br><b>${esc(p.property)}</b> vous attend le ${esc(p.checkIn)}${p.arrivalTime ? ` à partir de ${esc(p.arrivalTime)}` : ''}.${code}${guide}`
    : `Hello ${esc(p.name)},<br><br><b>${esc(p.property)}</b> is ready for you on ${esc(p.checkIn)}${p.arrivalTime ? ` from ${esc(p.arrivalTime)}` : ''}.${code}${guide}`
  const href = `${siteUrl()}/account${p.reservationId ? `/reservations/${p.reservationId}` : ''}`
  return { subject: `${title} · ${p.property}`, html: layout(title, body, { label: f ? 'Mon guide d’arrivée' : 'My arrival guide', href }), text: `${title}\n${p.property}\n${p.accessCode ?? ''}\n${href}` }
}

export function invoiceEmail(p: BookingMail & { invoiceUrl?: string | null }): Mail {
  const f = fr(p.locale)
  const title = f ? 'Votre facture Imperial Home' : 'Your Imperial Home invoice'
  const body = f
    ? `Bonjour ${esc(p.name)},<br>voici la facture de votre séjour <b>${esc(p.code)}</b> à ${esc(p.property)}.`
    : `Hello ${esc(p.name)},<br>here is the invoice for your stay <b>${esc(p.code)}</b> at ${esc(p.property)}.`
  const href = p.invoiceUrl || `${siteUrl()}/account`
  return { subject: `${title} · ${p.code}`, html: layout(title, body, { label: f ? 'Télécharger' : 'Download', href }), text: `${title}\n${href}` }
}
