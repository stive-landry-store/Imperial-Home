/** URL used in Supabase e-mail links (must be whitelisted in Auth → URL Configuration). */
export function authRedirectUrl(path = '/reset-password') {
  const configured = import.meta.env.VITE_APP_URL?.replace(/\/$/, '')
  const base = configured || window.location.origin
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export function authRedirectHint() {
  const origin = window.location.origin
  const configured = import.meta.env.VITE_APP_URL?.replace(/\/$/, '')
  const urls = new Set([`${origin}/reset-password`])
  if (configured) urls.add(`${configured}/reset-password`)
  urls.add('http://localhost:5173/reset-password')
  urls.add('http://localhost:5174/reset-password')
  return [...urls].join('\n')
}
