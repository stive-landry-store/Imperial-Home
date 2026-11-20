import { useEffect, useRef } from 'react'
import { captchaEnabled } from '../../lib/captcha'

// Cloudflare Turnstile captcha. Shown only when VITE_TURNSTILE_SITE_KEY is set.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loader: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('turnstile'))
    document.head.appendChild(script)
  })
  return loader
}

export function Turnstile({ onToken, theme }: { onToken: (token: string | null) => void; theme: 'dark' | 'light' }) {
  const box = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  useEffect(() => {
    callback.current = onToken
  }, [onToken])

  useEffect(() => {
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY
    if (!key || !box.current) return
    let id: string | null = null
    let cancelled = false
    void loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        id = window.turnstile.render(box.current, {
          sitekey: key,
          theme,
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        })
      })
      .catch(() => callback.current(null))
    return () => {
      cancelled = true
      if (id && window.turnstile) window.turnstile.remove(id)
    }
  }, [theme])

  if (!captchaEnabled) return null
  return <div ref={box} className="ih-reveal flex justify-center" />
}
