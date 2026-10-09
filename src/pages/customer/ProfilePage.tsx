import { useEffect, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { SocialLinks } from '../../components/layout/SocialLinks'
import { useAuth } from '../../hooks/useAuth'
import { shareSite } from '../../lib/social'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
  const { t } = useTranslation()
  const { profile, isStaff, signOut, updatePassword, reloadProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cni, setCni] = useState('')
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!profile || hydrated) return
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setCni(profile.cni ?? '')
    setHydrated(true)
  }, [profile, hydrated])

  async function upload(file: File, kind: 'avatar' | 'cover') {
    if (!supabase || !profile) return
    setError(null)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${profile.id}/${kind}.${ext}`
    const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    const { data } = supabase.storage.from('profile-media').getPublicUrl(path)
    const url = `${data.publicUrl}?v=${Date.now()}`
    const patch = kind === 'avatar' ? { avatar_url: url } : { cover_url: url }
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', profile.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await reloadProfile()
  }

  async function onSubmit(event: FormEvent) {
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
    setSaved(true)
  }

  async function onPassword(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) return
    setError(null)
    try {
      await updatePassword(password)
      setPassword('')
      setPasswordSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  async function onShare() {
    const result = await shareSite()
    if (result === 'copied') {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-2xl">
      <Helmet>
        <title>{t('account.profile')} | Imperial Home</title>
      </Helmet>
      <section className="relative mb-16 overflow-hidden border border-[#d4af6a]/30 bg-black">
        <div className="h-44 bg-[#1a140c] sm:h-56">
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,#3a2d16,transparent_60%)]" />
          )}
        </div>
        <label className="absolute top-3 right-3 cursor-pointer bg-black/70 px-3 py-2 text-[11px] tracking-[0.14em] text-[#d4af6a] uppercase">
          {t('account.cover')}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file, 'cover')
            }}
          />
        </label>
        <div className="absolute bottom-0 left-6 translate-y-1/2">
          <label className="group relative block h-24 w-24 cursor-pointer overflow-hidden rounded-full border-4 border-[var(--page-bg,#0c0c0c)] bg-[#2a2114]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center font-display text-3xl text-[#d4af6a]">
                {(profile?.full_name || profile?.email || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[9px] tracking-[0.12em] text-[#d4af6a] uppercase opacity-0 group-hover:opacity-100">
              {t('account.avatar')}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file, 'avatar')
              }}
            />
          </label>
        </div>
      </section>

      <h1 className="font-display text-4xl">{profile?.full_name || t('account.profile')}</h1>
      <p className="mt-1 text-sm theme-muted">{profile?.email}</p>

      <form className="mt-8 space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <div>
          <Label>{t('auth.name')}</Label>
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </div>
        <div>
          <Label>{t('auth.phone')}</Label>
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div>
          <Label>{t('account.cni')}</Label>
          <Input value={cni} onChange={(event) => setCni(event.target.value)} />
        </div>
        <div>
          <Label>{t('auth.email')}</Label>
          <Input value={profile?.email ?? ''} disabled />
        </div>
        <Button type="submit">{t('account.save')}</Button>
        {saved ? <p className="text-sm text-[#d4af6a]">{t('account.saved')}</p> : null}
      </form>

      <form className="mt-10 space-y-4 border-t border-[#d4af6a]/25 pt-8" onSubmit={(event) => void onPassword(event)}>
        <h2 className="font-display text-2xl">{t('account.password')}</h2>
        <div>
          <Label>{t('account.newPassword')}</Label>
          <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </div>
        <Button type="submit" variant="outline">
          {t('account.changePassword')}
        </Button>
        {passwordSaved ? <p className="text-sm text-[#d4af6a]">{t('account.passwordSaved')}</p> : null}
      </form>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-10 grid gap-3 border-t border-[#d4af6a]/25 pt-8 sm:grid-cols-2">
        <Button to="/account" variant="ghost">
          {t('account.title')}
        </Button>
        <Button to="/account/chat" variant="ghost">
          {t('account.chat')}
        </Button>
        {isStaff ? (
          <Button to="/admin" variant="ghost">
            {t('nav.admin')}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => void onShare()}>
          {copied ? t('nav.copied') : t('account.share')}
        </Button>
        <Button type="button" variant="dark" onClick={() => void signOut()}>
          {t('nav.logout')}
        </Button>
      </div>

      <div className="mt-10">
        <p className="mb-3 text-[13px] tracking-[0.18em] text-[#d4af6a] uppercase">{t('account.social')}</p>
        <SocialLinks />
      </div>
    </div>
  )
}