import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const R = 20
const C = 2 * Math.PI * R

/** Appears once the visitor has scrolled; its ring fills with the reading progress. */
export function BackToTop() {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const root = document.documentElement
      const max = Math.max(1, root.scrollHeight - window.innerHeight)
      setProgress(Math.min(1, window.scrollY / max))
      setShown(window.scrollY > 700)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <button
      type="button"
      className={`ih-top fixed z-40 grid h-12 w-12 place-items-center rounded-full${shown ? ' is-shown' : ''}`}
      style={{ left: 'max(0.75rem, env(safe-area-inset-left))', bottom: 'max(9rem, calc(env(safe-area-inset-bottom) + 8.25rem))' }}
      aria-label={t('common.back')}
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg viewBox="0 0 48 48" className="ih-top-ring absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={R} fill="none" stroke="var(--line)" strokeWidth="2.5" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="var(--accent-strong)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
        />
      </svg>
      <ArrowUp className="ih-top-arrow relative h-5 w-5" />
    </button>
  )
}
