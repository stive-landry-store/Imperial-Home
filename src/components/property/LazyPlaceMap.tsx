import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'

// The map library (Leaflet) is heavy: download it only when the map is about to be seen.
const PlaceMap = lazy(() => import('./PlaceMap').then((m) => ({ default: m.PlaceMap })))

type Props = ComponentProps<typeof PlaceMap>

export function LazyPlaceMap(props: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = box.current
    if (!el || near) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near])

  const placeholder = <div className={cn('ih-shimmer rounded-2xl', props.className ?? 'h-64')} aria-hidden />
  return (
    <div ref={box}>
      {near ? (
        <Suspense fallback={placeholder}>
          <PlaceMap {...props} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  )
}
