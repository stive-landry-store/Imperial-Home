import { useCallback, useEffect, useRef, useState } from 'react'
import { Fingerprint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { disableLock, lockEnabled, unlock } from '../lib/appLock'

const AWAY_MS = 30_000

export function AppLock() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [locked, setLocked] = useState(() => lockEnabled())
  const [failed, setFailed] = useState(false)
  const hiddenAt = useRef<number | null>(null)

  const attempt = useCallback(async () => {
    setFailed(false)
    const ok = await unlock()
    if (ok) setLocked(false)
    else setFailed(true)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now()
        return
      }
      if (hiddenAt.current && Date.now() - hiddenAt.current > AWAY_MS && lockEnabled()) setLocked(true)
      hiddenAt.current = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (locked && user) void attempt()
  }, [locked, user, attempt])

  if (!locked || !user) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-[#050505] p-6 text-center text-[#f4eee3]">
      <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="h-28 w-auto" />
      <p className="font-display text-xl tracking-[0.2em] text-[#ecd08a] uppercase">Impérial Home</p>
      <button
        type="button"
        className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#b8893b] to-[#ecd08a] px-6 text-sm font-semibold text-[#17110a]"
        onClick={() => void attempt()}
      >
        <Fingerprint className="h-5 w-5" />
        {t('app.unlock')}
      </button>
      {failed ? <p className="text-sm text-red-300">{t('app.unlockFailed')}</p> : null}
      <button
        type="button"
        className="text-xs text-[#a89f90] underline"
        onClick={() => {
          disableLock()
          void signOut().finally(() => setLocked(false))
        }}
      >
        {t('app.lockForgot')}
      </button>
    </div>
  )
}
