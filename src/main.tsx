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
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    void navigator.serviceWorker.register(`${base}sw.js`)
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
