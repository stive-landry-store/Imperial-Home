import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ZoomableImage } from './ZoomableImage'

export function ImageLightbox({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(start)
  const move = (direction: 1 | -1) => setActive((index) => (index + direction + images.length) % images.length)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % images.length)
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black" role="dialog">
      <button type="button" className="absolute top-4 right-4 z-10 rounded-full bg-black/60 px-4 py-2 text-sm tracking-[0.2em] text-[#d4af6a] uppercase" onClick={onClose}>
        {t('common.cancel')}
      </button>
      {images.length > 1 ? (
        <button type="button" className="absolute left-2 z-10 px-3 py-4 text-4xl text-[#d4af6a]" onClick={() => move(-1)}>
          ‹
        </button>
      ) : null}
      <ZoomableImage key={active} src={images[active]} alt="" onSwipe={move} />
      {images.length > 1 ? (
        <>
          <p className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-sm tracking-widest text-[#ecd08a]">
            {active + 1} / {images.length}
          </p>
          <button type="button" className="absolute right-2 z-10 px-3 py-4 text-4xl text-[#d4af6a]" onClick={() => move(1)}>
            ›
          </button>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
