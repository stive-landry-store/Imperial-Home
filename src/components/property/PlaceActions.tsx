import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Bookmark, MapPinned, Navigation, Share2 } from 'lucide-react'
import { placeIsSaved, placeLinks, savePlace, type ImperialPlace } from '../../lib/place'
import { shareSite } from '../../lib/social'

function Action({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
  const className =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium touch-manipulation'
  if (href) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  )
}

export function PlaceActions({ place }: { place: ImperialPlace }) {
  const { t } = useTranslation()
  const links = placeLinks(place)
  const [saved, setSaved] = useState(() => placeIsSaved())
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Action
        onClick={() => {
          savePlace()
          setSaved(true)
        }}
      >
        <Bookmark className={saved ? 'h-4 w-4 fill-current text-[#c4a35a]' : 'h-4 w-4'} />
        {saved ? t('place.saved') : t('place.save')}
      </Action>
      <Action href={links.directions}>
        <Navigation className="h-4 w-4" />
        {t('place.directions')}
      </Action>
      <Action href={links.google}>
        <MapPinned className="h-4 w-4" />
        {t('place.google')}
      </Action>
      <Action href={links.apple}>
        <MapPinned className="h-4 w-4" />
        {t('place.apple')}
      </Action>
      <Action href={links.whatsapp}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="#25D366"
            d="M12 3.2A8.7 8.7 0 0 0 4.7 16.3L3.5 20.5l4.3-1.1A8.8 8.8 0 1 0 12 3.2zm4.8 12.3c-.2.6-1.2 1.1-1.6 1.1-.4.1-.9.2-2.9-.6-2.4-1-4-3.4-4.1-3.6-.2-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.1.1.3 0 .5-.1.2-.2.3-.3.5l-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.3.1 1.6.8 1.9.9.3.2.4.2.5.3.1.2.1.7-.1 1.3z"
          />
        </svg>
        {t('place.whatsapp')}
      </Action>
      <Action
        onClick={() =>
          void shareSite(links.shareUrl).then((result) => {
            if (result === 'copied') {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            }
          })
        }
      >
        <Share2 className="h-4 w-4" />
        {copied ? t('nav.copied') : t('place.share')}
      </Action>
    </div>
  )
}
