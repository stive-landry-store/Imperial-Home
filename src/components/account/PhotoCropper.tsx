import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'

type Props = {
  file: File
  aspect: number
  round?: boolean
  outputWidth: number
  title: string
  onCancel: () => void
  onDone: (file: File) => void
}

type Point = { x: number; y: number }

export function PhotoCropper({ file, aspect, round = false, outputWidth, title, onCancel, onDone }: Props) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const pointers = useRef(new Map<number, Point>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  const frameW = Math.min(typeof window === 'undefined' ? 340 : window.innerWidth - 48, round ? 300 : 360)
  const frameH = frameW / aspect

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setUrl(objectUrl)
      setImg(image)
    }
    image.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const baseScale = img ? Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) : 1
  const scale = baseScale * zoom
  const width = img ? img.naturalWidth * scale : 0
  const height = img ? img.naturalHeight * scale : 0

  const clamp = useCallback(
    (p: Point, w: number, h: number): Point => ({
      x: Math.min(0, Math.max(frameW - w, p.x)),
      y: Math.min(0, Math.max(frameH - h, p.y)),
    }),
    [frameW, frameH],
  )

  useEffect(() => {
    if (!img) return
    const w = img.naturalWidth * baseScale
    const h = img.naturalHeight * baseScale
    setPos({ x: (frameW - w) / 2, y: (frameH - h) / 2 })
  }, [img, baseScale, frameW, frameH])

  function applyZoom(next: number, anchor?: Point) {
    if (!img) return
    const z = Math.min(4, Math.max(1, next))
    const ax = anchor?.x ?? frameW / 2
    const ay = anchor?.y ?? frameH / 2
    const ratio = (baseScale * z) / scale
    const nx = ax - (ax - pos.x) * ratio
    const ny = ay - (ay - pos.y) * ratio
    setZoom(z)
    setPos(clamp({ x: nx, y: ny }, img.naturalWidth * baseScale * z, img.naturalHeight * baseScale * z))
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous || !img) return
    const current = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, current)
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      applyZoom(pinch.current.zoom * (distance / pinch.current.distance))
      return
    }
    setPos((p) => clamp({ x: p.x + current.x - previous.x, y: p.y + current.y - previous.y }, width, height))
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  async function confirm() {
    if (!img) return
    setBusy(true)
    const outW = outputWidth
    const outH = Math.round(outputWidth / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setBusy(false)
      return
    }
    const r = outW / frameW
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, pos.x * r, pos.y * r, width * r, height * r)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    setBusy(false)
    if (!blob) return
    onDone(new File([blob], 'photo.jpg', { type: 'image/jpeg', lastModified: Date.now() }))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-[#d4af6a]/60 bg-[#0a0907] p-5 text-[#f4eee3]">
        <p className="text-center font-display text-lg tracking-wider text-[#ecd08a]">{title}</p>
        <p className="mt-1 text-center text-xs text-[#a89f90]">{t('common.cropHint')}</p>
        <div className="mt-4 flex justify-center">
          <div
            className={`relative touch-none overflow-hidden bg-black ring-2 ring-[#d4af6a] ${round ? 'rounded-full' : 'rounded-lg'}`}
            style={{ width: frameW, height: frameH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(event) => applyZoom(zoom - event.deltaY * 0.002)}
          >
            {img ? (
              <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={{ width, height, left: pos.x, top: pos.y, maxWidth: 'none', maxHeight: 'none' }}
              />
            ) : null}
            {!round ? (
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="border border-white/15" />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button type="button" aria-label="-" className="grid h-9 w-9 place-items-center rounded-full border border-[#d4af6a]/60 text-[#ecd08a]" onClick={() => applyZoom(zoom - 0.25)}>
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(event) => applyZoom(Number(event.target.value))}
            className="h-2 flex-1 accent-[#d4af6a]"
            aria-label="Zoom"
          />
          <button type="button" aria-label="+" className="grid h-9 w-9 place-items-center rounded-full border border-[#d4af6a]/60 text-[#ecd08a]" onClick={() => applyZoom(zoom + 0.25)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="min-h-11 rounded-full border border-[#d4af6a]/60 text-sm text-[#ecd08a]" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!img || busy}
            className="min-h-11 rounded-full bg-gradient-to-r from-[#b8893b] to-[#ecd08a] text-sm font-semibold text-[#17110a] disabled:opacity-60"
            onClick={() => void confirm()}
          >
            {t('common.cropApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
