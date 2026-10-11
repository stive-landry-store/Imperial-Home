import { useTranslation } from 'react-i18next'

function embedUrl(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export function PropertyVideo({ url }: { url: string }) {
  const { t } = useTranslation()
  const embed = embedUrl(url)
  return (
    <section className="mt-8 max-w-3xl">
      <h2 className="font-display text-3xl">{t('app.videoTour')}</h2>
      <div className="mt-3 aspect-video overflow-hidden bg-black">
        {embed ? (
          <iframe src={embed} title={t('app.videoTour')} className="h-full w-full" allow="fullscreen; picture-in-picture" loading="lazy" />
        ) : (
          <video src={url} className="h-full w-full" controls playsInline preload="metadata" />
        )}
      </div>
    </section>
  )
}
