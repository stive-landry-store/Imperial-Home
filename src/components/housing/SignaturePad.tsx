import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '../../lib/cn'

export function SignaturePad({
  value,
  onChange,
  disabled,
  label,
  compact = false,
}: {
  value: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
  label: string
  compact?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = value
    }
  }, [value])

  function pos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    }
  }

  function start(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  return (
    <div>
      <p className="mb-0.5 text-[0.62em] tracking-[0.08em] text-[#8a7344] uppercase">{label}</p>
      <canvas
        ref={canvasRef}
        width={320}
        height={72}
        className={cn(
          'w-full touch-none border-b border-dotted border-[#c4a35a] bg-transparent',
          compact ? 'h-[2.1em]' : 'h-[2.6em]',
          disabled ? 'pointer-events-none opacity-80' : 'cursor-crosshair',
        )}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      {!disabled ? (
        <button
          type="button"
          className="mt-1 text-[10px] tracking-wider text-[#8a7344] uppercase"
          onClick={() => {
            const canvas = canvasRef.current
            canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
            onChange('')
          }}
        >
          Effacer
        </button>
      ) : null}
    </div>
  )
}
