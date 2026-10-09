import { optimizeRemoteImage } from '../../lib/media'
import { cn } from '../../lib/cn'

export function OptimizedImage({
  src,
  alt,
  className,
  priority = false,
  width = 1200,
}: {
  src?: string | null
  alt: string
  className?: string
  priority?: boolean
  width?: number
}) {
  if (!src) return null
  return (
    <img
      src={optimizeRemoteImage(src, width)}
      alt={alt}
      width={width}
      height={Math.round(width * 0.75)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(className)}
    />
  )
}
