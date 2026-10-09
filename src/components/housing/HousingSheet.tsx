import {
  CalendarDays,
  IdCard,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wifi,
} from 'lucide-react'
import { ImperialMark, ImperialWordmark } from '../brand/Logo'
import { useTranslation } from 'react-i18next'
import { useLiveTranslation } from '../i18n/Live'
import { SectionCapsule } from '../brand/SectionCapsule'
import { DottedField } from './DottedField'
import { SignaturePad } from './SignaturePad'
import type { HousingSheetData } from '../../lib/housingSheet'
import { GUEST_FIELDS } from '../../lib/housingSheet'

type Role = 'guest' | 'admin' | 'view'

export function HousingSheet({
  data,
  onChange,
  role,
}: {
  data: HousingSheetData
  onChange: (next: HousingSheetData) => void
  role: Role
}) {
  function set<K extends keyof HousingSheetData>(key: K, value: HousingSheetData[K]) {
    onChange({ ...data, [key]: value })
  }

  function canEdit(key: keyof HousingSheetData) {
    if (role === 'view') return false
    if (role === 'admin') return true
    return GUEST_FIELDS.includes(key)
  }

  const { t } = useTranslation()
  const locked = (key: keyof HousingSheetData) => !canEdit(key)
  const sheetTitle = t('account.housing')
  const sheetLead = useLiveTranslation(
    'Merci de bien vouloir remplir cette fiche. Vos informations nous permettent de mieux vous accueillir et d’assurer votre confort.',
    'fr',
  )
  const clientInfo = useLiveTranslation('Informations du client', 'fr')
  const reception = useLiveTranslation('Contact de la réception', 'fr')
  const stayInfo = useLiveTranslation('Informations du séjour', 'fr')
  const wifiInfo = useLiveTranslation('Informations wifi', 'fr')
  const wifiLocked = useLiveTranslation('Le nom du Wi-Fi et le mot de passe s’affichent ici lorsque la réservation est validée.', 'fr')
  const pledgeTitle = useLiveTranslation('Engagement du client', 'fr')
  const pledge = useLiveTranslation(
    'Je soussigné(e) déclare avoir pris connaissance du règlement intérieur de l’établissement et m’engage à le respecter durant tout mon séjour.',
    'fr',
  )
  const guestSign = useLiveTranslation('Signature du client', 'fr')
  const receptionSign = useLiveTranslation('Signature de la réception', 'fr')
  const signLabel = useLiveTranslation('Signature', 'fr')
  const thanks = useLiveTranslation('MERCI ET BIENVENUE CHEZ IMPÉRIAL HOME !', 'fr')

  return (
    <article className="housing-a4 @container text-[#111]">
      <header className="housing-header relative overflow-hidden bg-black px-4 pt-5 pb-6 text-[#d4af6a] @2xl:px-8 @2xl:pt-7 @2xl:pb-8">
        <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-start @2xl:justify-between @2xl:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <ImperialMark className="h-14 w-auto shrink-0 @2xl:h-16" />
            <div className="min-w-0">
              <div className="@2xl:hidden">
                <ImperialWordmark light compact />
              </div>
              <div className="hidden @2xl:block">
                <ImperialWordmark light compact={false} />
              </div>
              <p className="mt-2 text-[0.52rem] tracking-[0.22em] text-[#d4af6a]">
                L&apos;ART DU SOIN. L&apos;ESPRIT DU DÉTAIL.
              </p>
            </div>
          </div>
          <div className="@2xl:text-right">
            <h1 className="font-display text-3xl leading-none tracking-[0.06em] text-[#d4af6a] @2xl:text-[2.15rem]">
              {sheetTitle}
            </h1>
          </div>
        </div>
        <p className="mt-6 max-w-xl text-[11px] leading-relaxed tracking-wide text-[#d4af6a]">{sheetLead}</p>
        <svg className="absolute inset-x-0 -bottom-px h-6 w-full" viewBox="0 0 800 24" preserveAspectRatio="none" aria-hidden>
          <path d="M0 24 C200 4 600 4 800 24 L800 24 L0 24 Z" fill="#ffffff" />
        </svg>
      </header>

      <div className="space-y-4 bg-white px-4 py-5 @2xl:px-7 @2xl:py-6">
        <div className="grid gap-4 @2xl:grid-cols-2">
          <section className="housing-box p-4">
            <SectionCapsule icon={UserRound}>{clientInfo}</SectionCapsule>
            <div className="mt-4 space-y-3">
              <DottedField icon={UserRound} label="Nom :" value={data.guest_name} disabled={locked('guest_name')} onChange={(v) => set('guest_name', v)} />
              <DottedField icon={Phone} label="Téléphone :" value={data.guest_phone} disabled={locked('guest_phone')} onChange={(v) => set('guest_phone', v)} />
              <DottedField icon={IdCard} label="N° CNI :" value={data.guest_cni} disabled={locked('guest_cni')} onChange={(v) => set('guest_cni', v)} />
            </div>
          </section>

          <section className="housing-box flex flex-col items-center justify-center p-4">
            <SectionCapsule icon={Phone}>{reception}</SectionCapsule>
            <div className="mt-5 flex flex-col items-center">
              <ImperialMark className="h-14 w-auto" />
              <p className="mt-1 font-display text-sm tracking-[0.28em] text-[#c4a35a]">IMPÉRIAL</p>
              <p className="text-[0.55rem] tracking-[0.4em] text-[#c4a35a]">HOME</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c4a35a] text-[#c4a35a]">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  value={data.reception_phone}
                  disabled={locked('reception_phone')}
                  onChange={(e) => set('reception_phone', e.target.value)}
                  className="w-36 border-0 bg-transparent font-display text-xl tracking-wide text-[#111] outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        <section className="housing-box p-4">
          <SectionCapsule icon={CalendarDays}>{stayInfo}</SectionCapsule>
          <div className="mt-5 grid gap-6 @2xl:grid-cols-2 @2xl:divide-x @2xl:divide-dotted @2xl:divide-[#c4a35a]">
            <div className="space-y-3 @2xl:pr-6">
              <DottedField icon={CalendarDays} label="Date d'arrivée :" type="date" value={data.arrival_date} disabled={locked('arrival_date')} onChange={(v) => set('arrival_date', v)} />
              <DottedField label="Heure d'arrivée :" type="time" value={data.arrival_time} disabled={locked('arrival_time')} onChange={(v) => set('arrival_time', v)} />
            </div>
            <div className="space-y-3 @2xl:pl-6">
              <DottedField icon={CalendarDays} label="Date de départ :" type="date" value={data.departure_date} disabled={locked('departure_date')} onChange={(v) => set('departure_date', v)} />
              <DottedField label="Heure de départ :" type="time" value={data.departure_time} disabled={locked('departure_time')} onChange={(v) => set('departure_time', v)} />
            </div>
          </div>
        </section>

        <section>
          <SectionCapsule icon={Wifi} className="mb-2">
            {wifiInfo}
          </SectionCapsule>
          {role !== 'admin' && !data.wifi_password ? (
            <p className="housing-box px-4 py-6 text-center text-[13px] leading-relaxed text-[#8a7344]">{wifiLocked}</p>
          ) : (
            <div className="housing-box grid gap-4 p-4 @2xl:grid-cols-2 @2xl:divide-x @2xl:divide-dotted @2xl:divide-[#c4a35a]">
              <DottedField label="Nom du wifi :" value={data.wifi_name} disabled={locked('wifi_name')} onChange={(v) => set('wifi_name', v)} className="@2xl:pr-4" />
              <DottedField label="Mot de passe :" value={data.wifi_password} disabled={locked('wifi_password')} onChange={(v) => set('wifi_password', v)} className="@2xl:pl-4" />
            </div>
          )}
        </section>

        <section className="housing-box p-4">
          <SectionCapsule icon={ShieldCheck}>{pledgeTitle}</SectionCapsule>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#333]">{pledge}</p>
          <div className="mt-4 grid gap-4 @2xl:grid-cols-2">
            <div className="housing-box p-3">
              <p className="mb-2 text-center text-[10px] tracking-[0.16em] text-[#8a7344] uppercase">{guestSign}</p>
              <DottedField label="Nom :" value={data.guest_sign_name} disabled={locked('guest_sign_name')} onChange={(v) => set('guest_sign_name', v)} />
              <div className="mt-2">
                <SignaturePad
                  label={signLabel}
                  value={data.guest_signature}
                  disabled={locked('guest_signature')}
                  onChange={(v) => set('guest_signature', v)}
                />
              </div>
            </div>
            <div className="housing-box p-3">
              <p className="mb-2 text-center text-[10px] tracking-[0.16em] text-[#8a7344] uppercase">{receptionSign}</p>
              <DottedField label="Nom :" value={data.reception_sign_name} disabled={locked('reception_sign_name')} onChange={(v) => set('reception_sign_name', v)} />
              <div className="mt-2">
                <SignaturePad
                  label={signLabel}
                  value={data.reception_signature}
                  disabled={locked('reception_signature')}
                  onChange={(v) => set('reception_signature', v)}
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <DottedField
              label="Nom de la réceptionniste :"
              value={data.receptionist_name}
              disabled={locked('receptionist_name')}
              onChange={(v) => set('receptionist_name', v)}
            />
          </div>
        </section>
      </div>

      <footer className="bg-black px-6 pt-5 pb-4 text-[#d4af6a]">
        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4 @2xl:divide-x @2xl:divide-[#d4af6a]/40">
          <FooterPill icon={Shield} title="Sécurité 24h/24" text="Votre sécurité est notre priorité." />
          <FooterPill icon={Wifi} title="Wifi haut débit" text="Restez connecté en toute simplicité." />
          <FooterPill icon={Sparkles} title="Service ménage" text="Confort et propreté au quotidien." />
          <FooterPill icon={Phone} title="Assistance" text="Équipe à votre écoute à tout moment." />
        </div>
        <p className="mt-4 text-center font-display text-sm tracking-[0.18em] text-[#d4af6a]">{thanks}</p>
      </footer>
    </article>
  )
}

function FooterPill({ icon: Icon, title, text }: { icon: typeof Shield; title: string; text: string }) {
  const shownTitle = useLiveTranslation(title, 'fr')
  const shownText = useLiveTranslation(text, 'fr')
  return (
    <div className="px-2 text-center">
      <Icon className="mx-auto mb-1.5 h-4 w-4" strokeWidth={1.4} />
      <p className="text-[10px] tracking-[0.14em] uppercase">{shownTitle}</p>
      <p className="mt-1 text-[9px] leading-snug text-[#d4af6a]/80">{shownText}</p>
    </div>
  )
}
