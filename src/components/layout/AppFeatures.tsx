import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Fingerprint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { disableLock, enableLock, lockEnabled, lockSupported } from '../../lib/appLock'
import { disableNotifications, enableNotifications, needsHomeScreenInstall, notificationsEnabled, notificationsSupported, previewOnScreen, registerPush } from '../../lib/systemNotifications'
import { cn } from '../../lib/cn'

function Row({ icon, label, on, onClick, disabled }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="ih-set-row flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-[var(--card-bg)] px-3.5 text-left disabled:opacity-50"
    >
      <span className="ih-set-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <span className="min-w-0 flex-1 text-[15px] font-medium">
        {label}
        {disabled ? <span className="block text-xs font-normal theme-muted">{t('app.unavailable')}</span> : null}
      </span>
      <span className={cn('ih-switch', on && 'is-on')} aria-hidden>
        <span className="ih-switch-knob" />
      </span>
    </button>
  )
}

export function AppFeatures() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [notif, setNotif] = useState(() => notificationsEnabled())
  const [lock, setLock] = useState(() => lockEnabled())
  const [lockOk, setLockOk] = useState(false)
  const [note, setNote] = useState('')
  const [trying, setTrying] = useState(false)

  useEffect(() => {
    void lockSupported().then(setLockOk)
    if (!notificationsSupported() || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return
    let cancelled = false
    void navigator.serviceWorker.ready.then(async (registration) => {
      if (cancelled) return
      const subscription = 'pushManager' in registration ? await registration.pushManager.getSubscription() : null
      if (!subscription) {
        setNotif(false)
        return
      }
      setNotif(true)
      const saved = await registerPush(registration)
      if (!saved) setNote(t('app.pushUnlinked'))
    })
    return () => {
      cancelled = true
    }
  }, [t])

  if (!user) return null
  const notifOk = notificationsSupported()

  return (
    <div className="ih-set-group mt-2 flex flex-col gap-2">
      <Row
        icon={<Bell className="h-5 w-5" />}
        label={t('app.notifications')}
        on={notif}
        disabled={!notifOk}
        onClick={() => {
          if (needsHomeScreenInstall()) {
            navigate('/installer')
            return
          }
          setNote('')
          if (notif) {
            void disableNotifications()
            setNotif(false)
          } else {
            void enableNotifications().then((result) => {
              setNotif(result === 'on' || result === 'unlinked')
              if (result === 'blocked') setNote(t('app.pushTryFail'))
              else if (result === 'unlinked') setNote(t('app.pushUnlinked'))
            })
          }
        }}
      />
      {notif ? (
        <button
          type="button"
          disabled={trying}
          className="mb-1 min-h-11 w-full rounded-xl px-3 text-left text-[15px] font-semibold text-accent disabled:opacity-50"
          onClick={() => {
            setTrying(true)
            void previewOnScreen()
              .then((result) => {
                if (result.saved) setNotif(true)
                setNote(result.shown ? t('app.pushTryOk') : t('app.pushTryFail'))
              })
              .catch(() => setNote(t('app.pushTryFail')))
              .finally(() => setTrying(false))
          }}
        >
          {t('app.pushTry')}
        </button>
      ) : null}
      {note ? <p className="px-3 pb-2 text-xs leading-snug theme-muted">{note}</p> : null}
      {notifOk && Notification.permission === 'denied' ? <p className="px-3 pb-2 text-xs theme-muted">{t('app.pushBlocked')}</p> : null}
      <Row
        icon={<Fingerprint className="h-5 w-5" />}
        label={t('app.lockTitle')}
        on={lock}
        disabled={!lockOk}
        onClick={() => {
          if (lock) {
            disableLock()
            setLock(false)
          } else void enableLock(profile?.email ?? user.email ?? '').then(setLock).catch(() => setLock(false))
        }}
      />
    </div>
  )
}
