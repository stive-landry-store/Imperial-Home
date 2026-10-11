import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { enableNotifications, pushSupported, syncPush } from '../lib/systemNotifications'

const DISMISSED = 'ih-push-prompt-dismissed'
const WAIT_MS = 3 * 24 * 3600 * 1000

function recentlyDismissed() {
  const at = Number(localStorage.getItem(DISMISSED) ?? 0)
  return at > 0 && Date.now() - at < WAIT_MS
}

export function PushPrompt() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    void syncPush()
    const canAsk = typeof Notification !== 'undefined' && Notification.permission === 'default' && pushSupported()
    if (canAsk && !recentlyDismissed()) {
      const timer = window.setTimeout(() => setVisible(true), 4000)
      return () => window.clearTimeout(timer)
    }
  }, [userId])

  if (!visible || !userId) return null

  function later() {
    localStorage.setItem(DISMISSED, String(Date.now()))
    setVisible(false)
  }

  async function enable() {
    await enableNotifications()
    setVisible(false)
  }

  return (
    <div
      className="fixed inset-x-0 z-[125] flex justify-center px-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      role="dialog"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-[#d4af6a]/70 bg-[#0b0b0c] p-4 text-[#f4eee3] shadow-[0_18px_50px_rgba(0,0,0,0.75)]">
        <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d4af6a] text-black">
          <BellRing className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] leading-snug font-semibold">{t('app.pushTitle')}</p>
          <p className="mt-1 text-[14px] leading-snug text-white/80">{t('app.pushBody')}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full bg-[#d4af6a] px-5 text-[15px] font-semibold text-black"
              onClick={() => void enable()}
            >
              {t('app.pushEnable')}
            </button>
            <button type="button" className="min-h-11 rounded-full px-4 text-[15px] text-white/75" onClick={later}>
              {t('app.pushLater')}
            </button>
          </div>
        </div>
        <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70" aria-label="Close" onClick={later}>
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
