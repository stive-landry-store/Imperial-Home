function isLocalHost(url: string) {
  return /localhost|127\.0\.0\.1/.test(url)
}

/** Site origin including Vite base path. Ignore a localhost VITE_APP_URL on the live host. */
export function appBaseUrl() {
  const configured = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || ''
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (configured && !(isLocalHost(configured) && !isLocalHost(origin))) return configured
    const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
    return `${origin}${basename}`
  }
  return configured || 'http://localhost:5173'
}

/** URL used in Supabase e-mail links (must be whitelisted in Auth → URL Configuration). */
export function authRedirectUrl(path = '/reset-password') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${appBaseUrl()}${normalized}`
}

export function authRedirectHint() {
  const urls = new Set([
    `${appBaseUrl()}/reset-password`,
    'http://localhost:5173/reset-password',
    'http://localhost:5174/reset-password',
  ])
  return [...urls].join('\n')
}
