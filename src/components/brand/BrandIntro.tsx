import { useEffect } from 'react'

const MIN_MS = 3400
const EXIT_MS = 1100

export function BrandIntro() {
  useEffect(() => {
    const boot = document.getElementById('ih-boot')
    if (!boot) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      boot.remove()
      document.body.classList.add('ih-ready')
      return
    }

    const timer = window.setTimeout(() => {
      boot.classList.add('is-leaving')
      document.body.classList.add('ih-ready')
      window.setTimeout(() => boot.remove(), EXIT_MS)
    }, MIN_MS)

    return () => window.clearTimeout(timer)
  }, [])

  return null
}
