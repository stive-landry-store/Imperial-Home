import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { VehicleMedia } from '../../lib/vehicles'
import { cn } from '../../lib/cn'

function sortedMedia(media: VehicleMedia[]) {
  return [...media].sort((a, b) => a.sort_order - b.sort_order)
}

function Frame({ item, className }: { item: VehicleMedia; className?: string }) {
  if (item.media_type === 'video') {
    return <video src={item.url} className={cn('h-full w-full object-cover', className)} controls muted playsInline />
  }
  return <img src={item.url} alt="" className={cn('h-full w-full object-cover', className)} />
}

export function VehicleGallery({ media, title }: { media: VehicleMedia[]; title: string }) {
  const { t } = useTranslation()
  const items = sortedMedia(media)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const current = items[active]

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % items.length)
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + items.length) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items.length])

  if (!current) {
    return <div className="flex aspect-[16/10] items-center justify-center bg-black text-[#d4af6a]/40">{title}</div>
  }

  return (
    <div>
      <button type="button" className="block aspect-[16/10] w-full overflow-hidden bg-black" onClick={() => setOpen(true)}>
        <Frame item={current} />
      </button>
      {items.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActive(index)
                setOpen(true)
              }}
              className={cn(
                'h-16 w-24 shrink-0 overflow-hidden border',
                index === active ? 'border-[#d4af6a]' : 'border-transparent',
              )}
            >
              {item.media_type === 'video' ? (
                <span className="flex h-full items-center justify-center bg-black text-[10px] text-[#d4af6a]">VIDEO</span>
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-xs tracking-[0.14em] text-[#d4af6a] uppercase">
        {items.length} {items.length > 1 ? t('cars.photos') : t('cars.photo')}
      </p>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          onClick={() => setOpen(false)}
        >
          <button type="button" className="absolute top-4 left-4 text-sm tracking-[0.2em] text-[#d4af6a] uppercase" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </button>
          <div className="max-h-[85svh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <Frame item={current} className="max-h-[85svh] object-contain" />
            {items.length > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-6">
                <button type="button" className="text-3xl text-[#d4af6a]" onClick={() => setActive((index) => (index - 1 + items.length) % items.length)}>
                  ‹
                </button>
                <span className="text-sm text-[#d4af6a]">
                  {active + 1} / {items.length}
                </span>
                <button type="button" className="text-3xl text-[#d4af6a]" onClick={() => setActive((index) => (index + 1) % items.length)}>
                  ›
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
