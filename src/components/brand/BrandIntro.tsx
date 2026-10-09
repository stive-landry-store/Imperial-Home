import { useEffect } from 'react'

const MIN_MS = 2000
const EXIT_MS = 700

export function BrandIntro() {
  useEffect(() => {
    const boot = document.getElementById('ih-boot')
    if (!boot) return
    boot.classList.add('is-ready')
    const started = Date.now()
    let done = false

    const leave = () => {
      if (done) return
      done = true
      const wait = Math.max(0, MIN_MS - (Date.now() - started))
      window.setTimeout(() => {
        boot.classList.add('is-leaving')
        document.body.classList.add('ih-ready')
        window.setTimeout(() => boot.remove(), EXIT_MS)
      }, wait)
    }

    if (document.readyState === 'complete') leave()
    else window.addEventListener('load', leave, { once: true })
    const cap = window.setTimeout(leave, 8000)
    return () => window.clearTimeout(cap)
  }, [])

  return null
}
