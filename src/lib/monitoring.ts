// Error tracking (Sentry) — active only when VITE_SENTRY_DSN is set.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

export async function startMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || !import.meta.env.PROD) return
  const Sentry = await import('@sentry/react')
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `imperial-home@${import.meta.env.VITE_RELEASE ?? 'web'}`,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    initialScope: { tags: { app: 'imperial-home', maker: 'stive landry store' } },
  })
}
