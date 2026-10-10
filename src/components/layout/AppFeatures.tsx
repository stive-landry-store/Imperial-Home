import { useEffect, useState } from 'react'
import { Bell, Fingerprint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { disableLock, enableLock, lockEnabled, lockSupported } from '../../lib/appLock'
import { disableNotifications, enableNotifications, notificationsEnabled, notificationsSupported } from '../../lib/systemNotifications'
import { cn } from '../../lib/cn'

function Row({ icon, label, on, onClick, disabled }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left disabled:opacity-50"
    >
      <span className="text-[#c4a35a]">{icon}</span>
      <span className="flex-1 text-[15px]">{label}</span>
      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', on ? 'bg-[#c4a35a] text-black' : 'bg-black/10 theme-muted')}>
        {disabled ? t('app.unavailable') : on ? t('app.on') : t('app.off')}
      </span>
    </button>
  )
}

export function AppFeatures() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [notif, setNotif] = useState(() => notificationsEnabled())
  const [lock, setLock] = useState(() => lockEnabled())
  const [lockOk, setLockOk] = useState(false)

  useEffect(() => {
    void lockSupported().then(setLockOk)
  }, [])

  if (!user) return null
  const notifOk = notificationsSupported()

  return (
    <div className="mt-4 rounded-2xl border border-black/10 p-1">
      <Row
        icon={<Bell className="h-5 w-5" />}
        label={t('app.notifications')}
        on={notif}
        disabled={!notifOk}
        onClick={() => {
          if (notif) {
            disableNotifications()
            setNotif(false)
          } else void enableNotifications().then(setNotif)
        }}
      />
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
