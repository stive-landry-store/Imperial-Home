import { useState } from 'react'
import { optimizeRemoteImage, responsiveSrcSet } from '../../lib/media'
import { cn } from '../../lib/cn'

export function OptimizedImage({
  src,
  alt,
  className,
  priority = false,
  width = 1200,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: {
  src?: string | null
  alt: string
  className?: string
  priority?: boolean
  width?: number
  sizes?: string
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (!src) return null
  // If a resized rendition is refused by the host, fall back to the original file.
  const optimized = failed ? src : optimizeRemoteImage(src, width)
  const srcSet = failed ? undefined : responsiveSrcSet(src, width)
  return (
    <img
      src={optimized}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={Math.round(width * 0.75)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (!failed && optimized !== src) setFailed(true)
      }}
      data-loaded={loaded ? 'true' : 'false'}
      className={cn('ih-img', className)}
    />
  )
}
