import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Field'
import { PasswordField } from '../ui/PasswordField'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

type Section = 'account' | 'phone' | 'email' | 'password' | 'cni' | null

export function ProfileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { profile, signOut, updatePassword, reloadProfile } = useAuth()
  const [section, setSection] = useState<Section>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cni, setCni] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setCni(profile.cni ?? '')
  }, [profile])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  function toggle(next: Section) {
    setNotice(null)
    setError(null)
    setSection((current) => (current === next ? null : next))
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !profile) return
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, cni })
      .eq('id', profile.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await reloadProfile()
    setNotice(t('account.saved'))
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) return
    setError(null)
    try {
      await updatePassword(password)
      setPassword('')
      setNotice(t('account.passwordSaved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const item =
    'mx-3 mt-2 flex min-h-14 w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-left text-base touch-manipulation'

  return createPortal(
    <div className="fixed inset-0 z-[80] flex h-dvh w-full flex-col bg-black text-[#d4af6a]" role="dialog" aria-modal="true" aria-label={t('account.profile')}>
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-display text-2xl">{t('account.profile')}</p>
        <button type="button" className="inline-flex min-h-12 min-w-12 items-center justify-center touch-manipulation" aria-label={t('common.cancel')} onClick={onClose}>
          <X size={28} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button type="button" className={item} onClick={() => toggle('account')}>
          <span className="flex-1">{t('account.myAccount')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#d4af6a]/70 rtl:scale-x-[-1]" />
        </button>
        {section === 'account' ? (
          <form className="space-y-3 px-4 pb-4" onSubmit={(event) => void saveProfile(event)}>
            <Label>{t('auth.name')}</Label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            <Button type="submit">{t('account.save')}</Button>
          </form>
        ) : null}

        <button type="button" className={item} onClick={() => toggle('phone')}>
          <span className="flex-1">{t('auth.phone')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#d4af6a]/70 rtl:scale-x-[-1]" />
        </button>
        {section === 'phone' ? (
          <form className="space-y-3 px-4 pb-4" onSubmit={(event) => void saveProfile(event)}>
            <Label>{t('auth.phone')}</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Button type="submit">{t('account.save')}</Button>
          </form>
        ) : null}

        <button type="button" className={item} onClick={() => toggle('email')}>
          <span className="flex-1">{t('auth.email')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#d4af6a]/70 rtl:scale-x-[-1]" />
        </button>
        {section === 'email' ? (
          <div className="space-y-3 px-4 pb-4">
            <Label>{t('auth.email')}</Label>
            <Input value={profile?.email ?? ''} disabled />
          </div>
        ) : null}

        <button type="button" className={item} onClick={() => toggle('password')}>
          <span className="flex-1">{t('account.password')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#d4af6a]/70 rtl:scale-x-[-1]" />
        </button>
        {section === 'password' ? (
          <form className="space-y-3 px-4 pb-4" onSubmit={(event) => void savePassword(event)}>
            <Label>{t('account.newPassword')}</Label>
            <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            <Button type="submit" variant="outline">
              {t('account.changePassword')}
            </Button>
          </form>
        ) : null}

        <button type="button" className={item} onClick={() => toggle('cni')}>
          <span className="flex-1">{t('account.cni')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#d4af6a]/70 rtl:scale-x-[-1]" />
        </button>
        {section === 'cni' ? (
          <form className="space-y-3 px-4 pb-4" onSubmit={(event) => void saveProfile(event)}>
            <Label>{t('account.cni')}</Label>
            <Input value={cni} onChange={(event) => setCni(event.target.value)} />
            <Button type="submit">{t('account.save')}</Button>
          </form>
        ) : null}

        <button type="button" className={item} onClick={() => void signOut()}>
          <span className="flex-1">{t('nav.logout')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#d4af6a]/70 rtl:scale-x-[-1]" />
        </button>
        {notice ? <p className="px-4 text-sm">{notice}</p> : null}
        {error ? <p className="px-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </div>,
    document.body,
  )
}
