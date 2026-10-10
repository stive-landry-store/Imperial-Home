import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const KEY = 'ih-install-dismissed'
const DAYS = 14

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function InstallPrompt() {
  const { t } = useTranslation()
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [show, setShow] = useState(false)
  const [help, setHelp] = useState(false)
  const ios = typeof navigator !== 'undefined' && isIos()

  useEffect(() => {
    if (isStandalone()) return
    try {
      const dismissed = Number(localStorage.getItem(KEY) ?? 0)
      if (Date.now() - dismissed < DAYS * 86_400_000) return
    } catch {
      /* ignore */
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const timer = window.setTimeout(() => setShow(true), 12_000)
    const installed = () => setShow(false)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', installed)
      window.clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    setShow(false)
    setHelp(false)
    try {
      localStorage.setItem(KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (event) {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') setShow(false)
      else dismiss()
      return
    }
    setHelp(true)
  }

  if (!show || (!event && !ios)) return null

  return (
    <>
      <div
        className="fixed inset-x-3 z-[60] mx-auto max-w-md rounded-2xl border border-[#d4af6a]/60 bg-[#0a0907] p-4 text-[#f4eee3] shadow-2xl"
        style={{ top: 'calc(5rem + env(safe-area-inset-top))' }}
      >
        <button type="button" aria-label={t('common.close')} className="absolute top-2 right-2 grid h-8 w-8 place-items-center text-[#a89f90]" onClick={dismiss}>
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-12 w-12 rounded-xl" />
          <div className="min-w-0">
            <p className="font-display text-base text-[#ecd08a]">{t('app.installTitle')}</p>
            <p className="text-xs text-[#a89f90]">{t('app.installLead')}</p>
          </div>
        </div>
        <button
          type="button"
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#b8893b] to-[#ecd08a] text-sm font-semibold text-[#17110a]"
          onClick={() => void install()}
        >
          <Download className="h-4 w-4" />
          {t('app.install')}
        </button>
      </div>
      {help ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4" onClick={() => setHelp(false)}>
          <div className="mb-6 w-full max-w-md rounded-2xl border border-[#d4af6a]/60 bg-[#0a0907] p-5 text-[#f4eee3]" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg text-[#ecd08a]">{t('app.iosTitle')}</p>
            <ol className="mt-3 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Share className="h-5 w-5 shrink-0 text-[#d4af6a]" />
                {t('app.iosStep1')}
              </li>
              <li className="flex items-center gap-3">
                <SquarePlus className="h-5 w-5 shrink-0 text-[#d4af6a]" />
                {t('app.iosStep2')}
              </li>
            </ol>
            <button type="button" className="mt-4 min-h-11 w-full rounded-full border border-[#d4af6a]/60 text-sm text-[#ecd08a]" onClick={dismiss}>
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
