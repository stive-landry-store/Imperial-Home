import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Camera, ChevronRight, Mail, MapPin, MessageCircle, Phone, Share2 } from 'lucide-react'
import { ProfileMenu } from '../../components/account/ProfileMenu'
import { PlaceMap } from '../../components/property/PlaceMap'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { useAuth } from '../../hooks/useAuth'
import { useSiteConfig } from '../../hooks/useSite'
import { fetchMyReservations } from '../../lib/data'
import { formatDate } from '../../lib/format'
import { compressPhoto } from '../../lib/compressImage'
import { imperialPlace, placeLinks } from '../../lib/place'
import { shareSite } from '../../lib/social'
import { supabase } from '../../lib/supabase'
import { fetchMyVehicleRentals } from '../../lib/vehicles'

function RoundAction({
  label,
  children,
  href,
  onClick,
}: {
  label: string
  children: ReactNode
  href?: string
  onClick?: () => void
}) {
  const className = 'flex min-w-0 flex-1 flex-col items-center gap-1 text-[13px] text-[#54656f] touch-manipulation'
  const icon = <span className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-[#ffffff] text-[#111b21]">{children}</span>
  if (href) {
    return (
      <a className={className} href={href}>
        {icon}
        {label}
      </a>
    )
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { profile, user, isStaff, admin, reloadProfile } = useAuth()
  const { data: config } = useSiteConfig()
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const verified = Boolean(isStaff && (admin?.is_verified || profile?.role === 'admin' || profile?.role === 'main_admin'))
  const stays = useQuery({ queryKey: ['my-reservations'], queryFn: fetchMyReservations })
  const cars = useQuery({
    queryKey: ['my-car-rentals', user?.id],
    queryFn: () => fetchMyVehicleRentals(user!.id),
    enabled: Boolean(user?.id),
  })
  const place = imperialPlace(config)
  const links = placeLinks(place)
  const reservations = stays.data ?? []
  const active = reservations.filter((item) => item.status !== 'cancelled' && item.status !== 'expired')
  const nights = active.reduce((sum, item) => sum + (item.nights || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const next = active.filter((item) => item.check_out >= today).sort((a, b) => a.check_in.localeCompare(b.check_in))[0]
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : i18n.language.startsWith('de') ? 'de-DE' : 'en-GB'
  const cover = profile?.cover_url || `${import.meta.env.BASE_URL}hero-accueil.jpg?v=2`

  async function upload(file: File, kind: 'avatar' | 'cover') {
    if (!supabase || !profile) return
    setError(null)
    const photo = await compressPhoto(file, kind === 'avatar' ? 800 : 1400, 0.82)
    const path = `${profile.id}/${kind}.jpg`
    const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, photo, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '31536000',
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

  async function share() {
    const result = await shareSite()
    if (result === 'copied') {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <div className="ih-profile bg-[#f0f2f5] pb-8 text-[#111b21]">
      <Helmet>
        <title>{t('account.profile')} | Impérial Home</title>
      </Helmet>
      <div className="flex items-center justify-between bg-[#ffffff] px-4 py-3">
        <p className="text-[17px] font-semibold">{t('account.profile')}</p>
        <button type="button" className="min-h-9 rounded-full border border-black/10 bg-[#ffffff] px-4 text-[14px] font-medium" onClick={() => setEditOpen(true)}>
          {t('account.modify')}
        </button>
      </div>
      <section className="bg-[#ffffff] pb-5">
        <div className="relative h-36 bg-[#d9d4c8]">
          <img src={cover} alt="" className="h-full w-full object-cover object-center" />
          <label className="absolute right-3 bottom-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/55 text-white">
            <Camera className="h-4 w-4" />
            <span className="sr-only">{t('account.cover')}</span>
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
        <div className="flex flex-col items-center px-4">
          <label className="relative -mt-12 block h-28 w-28 cursor-pointer">
            <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#1c1914] ring-[3px] ring-[#d4af6a]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-[#e0c57a]">{(profile?.full_name || profile?.email || '?').slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <span className="absolute right-0 bottom-0 grid h-8 w-8 place-items-center rounded-full bg-[#d4af6a] text-black">
              <Camera className="h-4 w-4" />
            </span>
            <span className="sr-only">{t('account.avatar')}</span>
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
          <p className="mt-3 flex max-w-full items-center gap-1.5 text-center text-[22px] leading-tight font-bold">
            <span className="truncate">{profile?.full_name || t('account.profile')}</span>
            {verified ? <VerifiedBadge className="h-5 w-5" title={t('admin.verified')} /> : null}
          </p>
          <p className="mt-1 text-center text-[14px] text-[#667781]">{isStaff ? admin?.title || t('account.adminLine') : t('account.guestLine')}</p>
        </div>
        <div className="mt-5 flex px-6">
          <RoundAction label={copied ? t('nav.copied') : t('account.shareAction')} onClick={() => void share()}>
            <Share2 className="h-5 w-5" />
          </RoundAction>
          <Link to="/account/chat" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[13px] text-[#54656f] touch-manipulation">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-[#ffffff] text-[#111b21]">
              <MessageCircle className="h-5 w-5" />
            </span>
            {t('account.messagesAction')}
          </Link>
        </div>
      </section>

      <section className="mx-3 mt-3 overflow-hidden rounded-xl bg-[#ffffff]">
        <p className="flex min-h-[52px] items-center border-b border-black/[0.06] px-4 text-[15px]">{t('account.houseCategory')}</p>
        <p className="flex min-h-[52px] items-center gap-2 border-b border-black/[0.06] px-4 text-[15px]">
          <MapPin className="h-4 w-4 shrink-0 text-[#c4a35a]" />
          {place.address}
        </p>
        {next ? (
          <Link to={`/account/reservations/${next.id}`} className="flex min-h-[52px] items-center justify-between gap-3 border-b border-black/[0.06] px-4">
            <span>
              <span className="block text-[15px]">{next.properties?.name ?? next.public_code}</span>
              <span className="block text-[13px] text-[#667781]">
                {formatDate(next.check_in, locale)} → {formatDate(next.check_out, locale)}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#8696a0] rtl:scale-x-[-1]" />
          </Link>
        ) : (
          <p className="border-b border-black/[0.06] px-4 py-3 text-[14px] text-[#667781]">{t('account.emptyNext')}</p>
        )}
        <PlaceMap latitude={place.latitude} longitude={place.longitude} label={place.label} className="h-40 rounded-none border-0" />
        <a className="flex min-h-[48px] items-center justify-between px-4 text-[15px]" href={links.directions} target="_blank" rel="noreferrer">
          {t('place.directions')}
          <ChevronRight className="h-4 w-4 text-[#8696a0] rtl:scale-x-[-1]" />
        </a>
      </section>

      <section className="mx-3 mt-3 overflow-hidden rounded-xl bg-[#ffffff]">
        <p className="px-4 pt-3 text-[13px] text-[#667781]">{t('account.contact')}</p>
        {profile?.phone ? (
          <a href={`tel:${profile.phone}`} className="flex min-h-[48px] items-center gap-3 px-4">
            <Phone className="h-4 w-4 text-[#8696a0]" />
            {profile.phone}
          </a>
        ) : null}
        {profile?.email ? (
          <a href={`mailto:${profile.email}`} className="flex min-h-[48px] items-center gap-3 px-4">
            <Mail className="h-4 w-4 text-[#8696a0]" />
            <span className="min-w-0 truncate">{profile.email}</span>
          </a>
        ) : null}
        {profile?.cni ? (
          <p className="flex min-h-[48px] items-center justify-between gap-3 px-4">
            <span className="text-[13px] text-[#667781]">{t('account.cni')}</span>
            <span>{profile.cni}</span>
          </p>
        ) : null}
      </section>

      <section className="mx-3 mt-3 overflow-hidden rounded-xl bg-[#ffffff]">
        <Link to="/account" className="flex min-h-[52px] items-center justify-between border-b border-black/[0.06] px-4">
          <span>{t('account.statsStays')}</span>
          <span className="text-[#667781]">{active.length}</span>
        </Link>
        <p className="flex min-h-[52px] items-center justify-between border-b border-black/[0.06] px-4">
          <span>{t('account.statsNights')}</span>
          <span className="text-[#667781]">{nights}</span>
        </p>
        <Link to="/account" className="flex min-h-[52px] items-center justify-between px-4">
          <span>{t('account.statsCars')}</span>
          <span className="text-[#667781]">{cars.data?.length ?? 0}</span>
        </Link>
      </section>
      {error ? <p className="mx-4 mt-3 text-sm text-red-700">{error}</p> : null}
      <ProfileMenu open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  )
}
