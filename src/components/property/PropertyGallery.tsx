import { useState } from 'react'
import type { PropertyImage } from '../../types/database'
import { localized } from '../../lib/format'
import { cn } from '../../lib/cn'

export function PropertyGallery({ images, lang }: { images: PropertyImage[]; lang: string }) {
  const sorted = [...images].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
  const [active, setActive] = useState(0)
  const current = sorted[active]
  if (!current) return <div className="aspect-[16/10] bg-black" />

  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden bg-black">
        {current.url ? (
          <img
            src={current.url}
            alt={localized(current.alt_en, current.alt_fr, lang)}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      {sorted.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn('h-16 w-24 shrink-0 overflow-hidden border', i === active ? 'border-[#d4af6a]' : 'border-transparent')}
            >
              {img.url ? <img src={img.url} alt="" className="h-full w-full object-cover" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
