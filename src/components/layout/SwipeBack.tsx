import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { haptic } from '../../lib/haptics'

const EDGE = 28
const DISTANCE = 90

export function SwipeBack() {
  const navigate = useNavigate()
  useEffect(() => {
    let start: { x: number; y: number } | null = null
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      const blocked = (event.target as Element | null)?.closest?.('.leaflet-container, input[type="range"], [data-no-swipe]')
      start = touch.clientX <= EDGE && !blocked ? { x: touch.clientX, y: touch.clientY } : null
    }
    const onMove = (event: TouchEvent) => {
      if (!start) return
      const touch = event.touches[0]
      const dx = touch.clientX - start.x
      const dy = Math.abs(touch.clientY - start.y)
      if (dy > 60) {
        start = null
        return
      }
      if (dx > DISTANCE) {
        start = null
        const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (index > 0) {
          haptic(12)
          navigate(-1)
        }
      }
    }
    const onEnd = () => {
      start = null
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [navigate])
  return null
}
