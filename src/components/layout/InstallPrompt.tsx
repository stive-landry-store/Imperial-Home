import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { devicePlatform, installEvent, isStandalone } from '../../lib/installPrompt'

const KEY = 'ih-install-dismissed'
const DAYS = 14

export function InstallPrompt() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const platform = devicePlatform()
  const [native, setNative] = useState(() => Boolean(installEvent()))

  useEffect(() => {
    if (isStandalone()) return
    try {
      const dismissed = Number(localStorage.getItem(KEY) ?? 0)
      if (Date.now() - dismissed < DAYS * 86_400_000) return
    } catch {
      /* ignore */
    }
    const sync = () => setNative(Boolean(installEvent()))
    window.addEventListener('ih-install-available', sync)
    const mobile = devicePlatform() !== 'desktop'
    const timer = window.setTimeout(() => {
      if (mobile || installEvent()) setShow(true)
    }, 6_000)
    const installed = () => setShow(false)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('ih-install-available', sync)
      window.removeEventListener('appinstalled', installed)
      window.clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  async function install() {
    const event = installEvent()
    if (!event) {
      dismiss()
      navigate('/installer')
      return
    }
    await event.prompt()
    const choice = await event.userChoice
    if (choice.outcome === 'accepted') setShow(false)
    else dismiss()
  }

  if (!show) return null

  return (
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
          <p className="font-display text-base text-[#ecd08a]">{platform === 'ios' ? t('app.installIos') : platform === 'android' ? t('app.installAndroid') : t('app.installTitle')}</p>
          <p className="text-xs text-[#a89f90]">{t('app.installLead')}</p>
        </div>
      </div>
      <button
        type="button"
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#b8893b] to-[#ecd08a] text-sm font-semibold text-[#17110a]"
        onClick={() => void install()}
      >
        <Download className="h-4 w-4" />
        {native ? t('app.install') : t('app.howTo')}
      </button>
    </div>
  )
}
