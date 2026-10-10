import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { haptic } from '../../lib/haptics'

const TRIGGER = 80

export function PullToRefresh() {
  const client = useQueryClient()
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)

  useEffect(() => {
    const blocked = (target: EventTarget | null) =>
      Boolean((target as Element | null)?.closest?.('.leaflet-container, [role="dialog"], textarea, input, [data-no-pull], .overflow-y-auto'))
    const onStart = (event: TouchEvent) => {
      startY.current = window.scrollY <= 0 && !blocked(event.target) ? event.touches[0].clientY : null
    }
    const onMove = (event: TouchEvent) => {
      if (startY.current === null) return
      const dy = event.touches[0].clientY - startY.current
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0
        setPull(0)
        return
      }
      const eased = Math.min(110, dy * 0.5)
      pullRef.current = eased
      setPull(eased)
    }
    const onEnd = () => {
      const reached = pullRef.current >= TRIGGER * 0.5 + 6
      startY.current = null
      pullRef.current = 0
      if (reached) {
        haptic(15)
        setBusy(true)
        setPull(48)
        void client.invalidateQueries().finally(() => {
          window.setTimeout(() => {
            setBusy(false)
            setPull(0)
          }, 600)
        })
      } else {
        setPull(0)
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [client])

  if (pull <= 0 && !busy) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center" style={{ transform: `translateY(${Math.max(pull, 0) + 64}px)` }}>
      <span className="ih-loader grid place-items-center rounded-full border border-[#d4af6a]/60 bg-[#0a0907] p-1 shadow-lg" style={{ width: 40, height: 40 }}>
        <span className="ih-loader-ring" style={busy ? undefined : { animationPlayState: 'paused', transform: `rotate(${pull * 4}deg)` }} />
        <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="ih-loader-logo" draggable={false} />
      </span>
    </div>
  )
}
