/** Request a lighter rendition when the host supports it. Other URLs are left unchanged. */
export function optimizeRemoteImage(src: string | null | undefined, width = 1200) {
  if (!src) return ''
  try {
    const url = new URL(src)
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fm', 'webp')
      url.searchParams.set('q', '72')
      url.searchParams.set('w', String(width))
      url.searchParams.set('fit', 'crop')
      return url.toString()
    }
  } catch {
    return src
  }
  return src
}
