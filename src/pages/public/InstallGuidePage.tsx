import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Download, EllipsisVertical, Maximize, Share, SquarePlus, WifiOff, Zap } from 'lucide-react'
import { cn } from '../../lib/cn'
import { shareSite } from '../../lib/social'
import { devicePlatform, installEvent, isStandalone } from '../../lib/installPrompt'
import { enableNotifications, notificationsEnabled } from '../../lib/systemNotifications'
import { offlineReadyAt, warmOfflineData } from '../../lib/offlinePrefetch'

type Platform = 'ios' | 'android'

function Step({ n, text, icon }: { n: number; text: string; icon: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 px-4 py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d4af6a]/15 text-lg font-semibold text-[#d4af6a]">{n}</span>
      <span className="min-w-0 flex-1 text-[15px] leading-snug">{text}</span>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d4af6a]/30 text-[#d4af6a]">{icon}</span>
    </li>
  )
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-center gap-4 px-4 py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d4af6a]/15 text-[#d4af6a]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-sm theme-muted">{text}</span>
      </span>
    </li>
  )
}

export function InstallGuidePage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const detected = devicePlatform()
  const [platform, setPlatform] = useState<Platform>(detected === 'android' ? 'android' : 'ios')
  const [showOther, setShowOther] = useState(false)
  const [canInstall, setCanInstall] = useState(() => Boolean(installEvent()))
  const [readyAt, setReadyAt] = useState(() => offlineReadyAt())
  const [busy, setBusy] = useState(false)
  const [notifsOn, setNotifsOn] = useState(() => notificationsEnabled())
  const installed = isStandalone()

  useEffect(() => {
    const onInstall = () => setCanInstall(Boolean(installEvent()))
    const onReady = () => setReadyAt(offlineReadyAt())
    window.addEventListener('ih-install-available', onInstall)
    window.addEventListener('ih-offline-ready', onReady)
    return () => {
      window.removeEventListener('ih-install-available', onInstall)
      window.removeEventListener('ih-offline-ready', onReady)
    }
  }, [])

  async function installNow() {
    const event = installEvent()
    if (!event) return
    await event.prompt()
    await event.userChoice
  }

  async function download() {
    setBusy(true)
    try {
      await warmOfflineData(client, true)
    } finally {
      setBusy(false)
      setReadyAt(offlineReadyAt())
    }
  }

  return (
    <div className="theme-page min-h-svh">
      <Helmet>
        <title>{`${t('app.guideTitle')} | Imperial Home`}</title>
      </Helmet>
      <div className="mx-auto max-w-xl px-4 pt-28 pb-28">
        <div className="flex flex-col items-center text-center">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="Imperial Home" className="h-24 w-24 rounded-[1.4rem] border border-[#d4af6a]/40 shadow-lg" />
          <p className="mt-2 text-xs theme-muted">Imperial Home</p>
          <h1 className="mt-5 font-display text-4xl">{t('app.guideTitle')}</h1>
          <p className="mt-4 font-semibold">{t('app.guideSub')}</p>
          <p className="mt-1 max-w-md text-sm theme-muted">{t('app.guideLead')}</p>
        </div>

        {installed ? (
          <div className="mt-6 space-y-3">
            <p className="theme-card flex items-center justify-center gap-2 rounded-2xl p-4 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              {t('app.guideInstalled')}
            </p>
            {notifsOn ? null : (
              <button
                type="button"
                className="min-h-12 w-full rounded-full bg-[#d4af6a] text-[16px] font-semibold text-black"
                onClick={() => void enableNotifications().then((result) => setNotifsOn(result === 'on' || result === 'unlinked'))}
              >
                {t('app.pushEnableScreen')}
              </button>
            )}
          </div>
        ) : null}

        <div className="theme-card mt-6 flex items-center gap-3 rounded-2xl p-4">
          <WifiOff className="h-5 w-5 shrink-0 text-[#d4af6a]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{readyAt ? t('app.offlineReady') : t('app.offlinePreparing')}</p>
            <p className="text-xs theme-muted">{t('app.offlineLead')}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="shrink-0 rounded-full border border-[#d4af6a]/60 px-3 py-2 text-xs text-[#d4af6a] disabled:opacity-50"
          >
            {busy ? '…' : t('app.offlineRefresh')}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void shareSite(`${window.location.origin}/installer`, t('app.inviteText'))}
          className="mt-3 min-h-11 w-full rounded-full border border-[#d4af6a]/60 text-sm text-[#d4af6a]"
        >
          {t('app.guideShare')}
        </button>

        <h2 className="mt-8 text-xl font-semibold">{t('app.guideSteps')}</h2>
        <p className="mt-2 text-sm text-[#d4af6a]">
          {detected === 'ios' ? t('app.detectedIos') : detected === 'android' ? t('app.detectedAndroid') : t('app.detectedDesktop')}
        </p>
        {detected === 'desktop' || showOther ? (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-[#d4af6a]/30 p-1" role="tablist">
            {(['ios', 'android'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={platform === value}
                onClick={() => setPlatform(value)}
                className={cn('min-h-10 rounded-full text-sm', platform === value ? 'bg-[#d4af6a] font-semibold text-black' : 'text-[#d4af6a]')}
              >
                {value === 'ios' ? 'iPhone / iPad' : 'Android'}
              </button>
            ))}
          </div>
        ) : null}

        {platform === 'android' && canInstall ? (
          <button
            type="button"
            onClick={() => void installNow()}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#b8893b] to-[#ecd08a] font-semibold text-[#17110a]"
          >
            <Download className="h-5 w-5" />
            {t('app.install')}
          </button>
        ) : null}

        {platform === 'ios' ? (
          <>
            <p className="mt-4 text-sm theme-muted">{t('app.iosSafari')}</p>
            <ol className="theme-card mt-3 divide-y divide-[#d4af6a]/20 overflow-hidden rounded-2xl">
              <Step n={1} text={t('app.iosStep1')} icon={<Share className="h-5 w-5" />} />
              <Step n={2} text={t('app.iosStep2')} icon={<SquarePlus className="h-5 w-5" />} />
              <Step n={3} text={t('app.iosStep3')} icon={<Check className="h-5 w-5" />} />
              <Step n={4} text={t('app.iosStep4')} icon={<Check className="h-5 w-5" />} />
            </ol>
          </>
        ) : (
          <ol className="theme-card mt-4 divide-y divide-[#d4af6a]/20 overflow-hidden rounded-2xl">
            <Step n={1} text={t('app.androidStep1')} icon={<EllipsisVertical className="h-5 w-5" />} />
            <Step n={2} text={t('app.androidStep2')} icon={<Download className="h-5 w-5" />} />
            <Step n={3} text={t('app.androidStep3')} icon={<Check className="h-5 w-5" />} />
          </ol>
        )}

        {detected !== 'desktop' && !showOther ? (
          <button type="button" className="mt-4 text-sm text-[#d4af6a] underline" onClick={() => setShowOther(true)}>
            {t('app.otherPhone')}
          </button>
        ) : null}

        <ul className="theme-card mt-6 divide-y divide-[#d4af6a]/20 overflow-hidden rounded-2xl">
          <Benefit icon={<Zap className="h-5 w-5" />} title={t('app.benefit1')} text={t('app.benefit1Text')} />
          <Benefit icon={<Maximize className="h-5 w-5" />} title={t('app.benefit2')} text={t('app.benefit2Text')} />
          <Benefit icon={<WifiOff className="h-5 w-5" />} title={t('app.benefit3')} text={t('app.benefit3Text')} />
        </ul>
      </div>
    </div>
  )
}
