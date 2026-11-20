// Responsive, lighter images: WebP/AVIF renditions with srcset.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

const WIDTHS = [480, 800, 1200, 1600]

/** Supabase Image Transformation is used only when VITE_SUPABASE_IMAGE_TRANSFORM=1 (plan feature). */
const SUPABASE_TRANSFORM = import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM === '1'

/** Request a lighter rendition when the host supports it. Other URLs are left unchanged. */
export function optimizeRemoteImage(src: string | null | undefined, width = 1200) {
  if (!src) return ''
  try {
    const url = new URL(src, typeof window === 'undefined' ? 'https://imperial-home.local' : window.location.origin)
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fm', 'webp')
      url.searchParams.set('q', '72')
      url.searchParams.set('w', String(width))
      url.searchParams.set('fit', 'crop')
      return url.toString()
    }
    if (SUPABASE_TRANSFORM && url.pathname.includes('/storage/v1/object/public/')) {
      url.pathname = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      url.searchParams.set('width', String(width))
      url.searchParams.set('quality', '72')
      url.searchParams.set('resize', 'contain')
      return url.toString()
    }
  } catch {
    return src
  }
  return src
}

/** srcset for hosts that can resize, or undefined when the image is served as is. */
export function responsiveSrcSet(src: string | null | undefined, maxWidth = 1600) {
  if (!src) return undefined
  const first = optimizeRemoteImage(src, WIDTHS[0])
  if (first === src) return undefined
  return WIDTHS.filter((w) => w <= Math.max(maxWidth, WIDTHS[0]))
    .map((w) => `${optimizeRemoteImage(src, w)} ${w}w`)
    .join(', ')
}
