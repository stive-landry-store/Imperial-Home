/**
 * Imperial Home — application web.
 * Conçue et développée par l'entreprise « stive landry store ».
 * Créateur : stive landry store — NYAMI TCHOUPE STIVE LANDRY.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './i18n'
import './index.css'
import './lib/installPrompt'
import App from './App.tsx'
import { startMonitoring } from './lib/monitoring'

void startMonitoring()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // A new deploy installs a new worker; as soon as it takes control, reload once so the visitor
  // (and the installed app) always runs the latest version instead of a cached one.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    void navigator.serviceWorker
      .register(`${base}sw.js`, { updateViaCache: 'none' })
      .then((registration) => {
        void registration.update()
        const check = () => {
          if (document.visibilityState === 'visible') void registration.update()
        }
        document.addEventListener('visibilitychange', check)
        window.setInterval(check, 30 * 60_000)
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {import.meta.env.PROD ? (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    ) : null}
  </StrictMode>,
)
