import { useRef, useState } from 'react'

type Point = { x: number; y: number }

export function ZoomableImage({
  src,
  alt,
  onSwipe,
  onZoomChange,
}: {
  src: string
  alt: string
  onSwipe?: (direction: 1 | -1) => void
  onZoomChange?: (zoomed: boolean) => void
}) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const pointers = useRef(new Map<number, Point>())
  const pinch = useRef<{ distance: number; scale: number } | null>(null)
  const swipeStart = useRef<Point | null>(null)
  const lastTap = useRef(0)

  const apply = (nextScale: number, nextOffset: Point) => {
    const s = Math.min(5, Math.max(1, nextScale))
    setScale(s)
    setOffset(s === 1 ? { x: 0, y: 0 } : nextOffset)
    onZoomChange?.(s > 1)
  }

  function down(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale }
      swipeStart.current = null
    } else {
      swipeStart.current = { x: event.clientX, y: event.clientY }
      const now = Date.now()
      if (now - lastTap.current < 280) apply(scale > 1 ? 1 : 2.5, { x: 0, y: 0 })
      lastTap.current = now
    }
  }

  function move(event: React.PointerEvent) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const current = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, current)
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      apply(pinch.current.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance), offset)
      return
    }
    if (scale > 1) setOffset((o) => ({ x: o.x + current.x - previous.x, y: o.y + current.y - previous.y }))
  }

  function up(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const start = swipeStart.current
    swipeStart.current = null
    if (start && scale === 1 && onSwipe) {
      const dx = event.clientX - start.x
      if (Math.abs(dx) > 50 && Math.abs(event.clientY - start.y) < 80) onSwipe(dx < 0 ? 1 : -1)
    }
  }

  return (
    <div
      data-no-swipe
      data-no-pull
      className="flex h-full w-full touch-none items-center justify-center overflow-hidden"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onWheel={(event) => apply(scale - event.deltaY * 0.003, offset)}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-[85svh] max-w-full select-none object-contain"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transition: pointers.current.size ? 'none' : 'transform 0.2s' }}
      />
    </div>
  )
}
