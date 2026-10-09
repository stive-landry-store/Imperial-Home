import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Mail, MapPin, Phone } from 'lucide-react'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { useAuth } from '../../hooks/useAuth'
import { fetchMyReservations } from '../../lib/data'
import { formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { fetchMyVehicleRentals } from '../../lib/vehicles'

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { profile, user, isStaff, admin, reloadProfile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const verified = Boolean(isStaff && (admin?.is_verified || profile?.role === 'admin' || profile?.role === 'main_admin'))
  const stays = useQuery({ queryKey: ['my-reservations'], queryFn: fetchMyReservations })
  const cars = useQuery({
    queryKey: ['my-car-rentals', user?.id],
    queryFn: () => fetchMyVehicleRentals(user!.id),
    enabled: Boolean(user?.id),
  })

  const reservations = stays.data ?? []
  const active = reservations.filter((item) => item.status !== 'cancelled' && item.status !== 'expired')
  const nights = active.reduce((sum, item) => sum + (item.nights || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const next = active
    .filter((item) => item.check_out >= today)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))[0]
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : i18n.language.startsWith('de') ? 'de-DE' : 'en-GB'

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
        <div className="px-5 pb-6">
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
            {verified ? <VerifiedBadge className="h-7 w-7" title={t('admin.verified')} /> : null}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-[#d4af6a]">
            <MapPin className="h-4 w-4 shrink-0" />
            {isStaff ? admin?.title || t('account.adminLine') : t('account.guestLine')}
          </p>
          {profile?.email ? <p className="mt-1 truncate text-sm theme-muted">{profile.email}</p> : null}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link to="/account" className="flex min-h-16 flex-col items-center justify-center border border-[#d4af6a]/30 px-2 text-center touch-manipulation">
          <span className="font-display text-2xl">{active.length}</span>
          <span className="text-[11px] tracking-[0.12em] uppercase">{t('account.statsStays')}</span>
        </Link>
        <div className="flex min-h-16 flex-col items-center justify-center border border-[#d4af6a]/30 px-2 text-center">
          <span className="font-display text-2xl">{nights}</span>
          <span className="text-[11px] tracking-[0.12em] uppercase">{t('account.statsNights')}</span>
        </div>
        <Link to="/account" className="flex min-h-16 flex-col items-center justify-center border border-[#d4af6a]/30 px-2 text-center touch-manipulation">
          <span className="font-display text-2xl">{cars.data?.length ?? 0}</span>
          <span className="text-[11px] tracking-[0.12em] uppercase">{t('account.statsCars')}</span>
        </Link>
      </div>

      <section className="mt-4 border border-[#d4af6a]/30 p-4">
        <p className="text-xs tracking-[0.16em] text-[#d4af6a] uppercase">{t('account.nextStay')}</p>
        {next ? (
          <Link to={`/account/reservations/${next.id}`} className="mt-2 block min-h-12 touch-manipulation">
            <p className="font-display text-2xl">{next.properties?.name ?? next.public_code}</p>
            <p className="mt-1 text-sm theme-muted">
              {formatDate(next.check_in, locale)} → {formatDate(next.check_out, locale)}
            </p>
            <p className="mt-1 text-sm">{t(`status.${next.status}`)}</p>
          </Link>
        ) : (
          <div className="mt-2">
            <p className="text-sm theme-muted">{t('account.emptyNext')}</p>
            <Link to="/properties" className="mt-3 inline-flex min-h-12 items-center text-sm tracking-[0.14em] text-[#d4af6a] uppercase">
              {t('nav.book')}
            </Link>
          </div>
        )}
      </section>

      <section className="mt-4 border border-[#d4af6a]/30">
        <p className="px-4 pt-4 text-xs tracking-[0.16em] text-[#d4af6a] uppercase">{t('account.contact')}</p>
        {profile?.phone ? (
          <a href={`tel:${profile.phone}`} className="flex min-h-14 items-center gap-3 border-t border-[#d4af6a]/20 px-4 touch-manipulation">
            <Phone className="h-4 w-4 text-[#d4af6a]" />
            <span>{profile.phone}</span>
          </a>
        ) : null}
        {profile?.email ? (
          <a href={`mailto:${profile.email}`} className="flex min-h-14 items-center gap-3 border-t border-[#d4af6a]/20 px-4 touch-manipulation">
            <Mail className="h-4 w-4 text-[#d4af6a]" />
            <span className="min-w-0 truncate">{profile.email}</span>
          </a>
        ) : null}
        {profile?.cni ? (
          <p className="flex min-h-14 items-center gap-3 border-t border-[#d4af6a]/20 px-4">
            <span className="text-xs tracking-[0.14em] text-[#d4af6a] uppercase">{t('account.cni')}</span>
            <span>{profile.cni}</span>
          </p>
        ) : null}
      </section>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
