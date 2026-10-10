import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { PropertyImage } from '../../types/database'
import { localized } from '../../lib/format'
import { cn } from '../../lib/cn'
import { OptimizedImage } from '../ui/OptimizedImage'
import { ZoomableImage } from '../ui/ZoomableImage'

export function PropertyGallery({ images, lang }: { images: PropertyImage[]; lang: string }) {
  const { t } = useTranslation()
  const sorted = [...images].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const current = sorted[active]

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % sorted.length)
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + sorted.length) % sorted.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sorted.length])

  if (!current) return <div className="aspect-[16/10] bg-black" />

  return (
    <div className="w-full min-w-0 max-w-full">
      <button type="button" className="block aspect-[16/10] w-full max-w-full overflow-hidden bg-black" onClick={() => setOpen(true)}>
        <OptimizedImage
          src={current.url}
          alt={localized(current.alt_en, current.alt_fr, lang) || 'Impérial Home'}
          priority
          className="h-full w-full object-cover"
        />
      </button>
      {sorted.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn('h-16 w-24 shrink-0 overflow-hidden border', i === active ? 'border-[#d4af6a]' : 'border-transparent')}
            >
              <OptimizedImage src={img.url} alt="" width={200} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black" role="dialog">
          <button type="button" className="absolute top-4 right-4 z-10 rounded-full bg-black/60 px-4 py-2 text-sm tracking-[0.2em] text-[#d4af6a] uppercase" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </button>
          {sorted.length > 1 ? (
            <button
              type="button"
              className="absolute left-2 z-10 px-3 py-4 text-4xl text-[#d4af6a]"
              onClick={() => setActive((index) => (index - 1 + sorted.length) % sorted.length)}
            >
              ‹
            </button>
          ) : null}
          <ZoomableImage
            key={current.id}
            src={current.url ?? ''}
            alt={localized(current.alt_en, current.alt_fr, lang) || ''}
            onSwipe={(direction) => setActive((index) => (index + direction + sorted.length) % sorted.length)}
          />
          {sorted.length > 1 ? (
            <p className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-sm tracking-widest text-[#ecd08a]">
              {active + 1} / {sorted.length}
            </p>
          ) : null}
          {sorted.length > 1 ? (
            <button
              type="button"
              className="absolute right-2 z-10 px-3 py-4 text-4xl text-[#d4af6a]"
              onClick={() => setActive((index) => (index + 1) % sorted.length)}
            >
              ›
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
