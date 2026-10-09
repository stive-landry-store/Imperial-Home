import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
  const { t } = useTranslation()
  const { profile, isStaff, admin, reloadProfile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const verified = Boolean(isStaff && (admin?.is_verified || profile?.role === 'admin' || profile?.role === 'main_admin'))

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

  return (
    <div className="mx-auto max-w-2xl">
      <Helmet>
        <title>{t('account.profile')} | Impérial Home</title>
      </Helmet>
      <section className="border border-[#d4af6a]/30 bg-black">
        <div className="relative h-44 sm:h-56">
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,#3a2d16,transparent_60%)]" />
          )}
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
        </div>
        <div className="px-5 pb-8">
          <label className="relative -mt-16 block h-36 w-36 cursor-pointer rounded-full border-4 border-[#d4af6a] bg-[#2a2114] shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center font-display text-5xl text-[#d4af6a]">
                {(profile?.full_name || profile?.email || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
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
          <p className="mt-3 text-xs tracking-[0.14em] text-[#d4af6a] uppercase">{t('account.avatar')}</p>
          <h1 className="mt-2 flex items-center gap-2 font-display text-4xl">
            <span className="min-w-0 truncate">{profile?.full_name || t('account.profile')}</span>
            {verified ? <VerifiedBadge className="h-7 w-7 shrink-0" title={t('admin.verified')} /> : null}
          </h1>
        </div>
      </section>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
