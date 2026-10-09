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

  const locked = (key: keyof HousingSheetData) => !canEdit(key)
  const sheetLead = useLiveTranslation(
    'Merci de bien vouloir remplir cette fiche. Vos informations nous permettent de mieux vous accueillir et d’assurer votre confort.',
    'fr',
  )
  const clientInfo = useLiveTranslation('Informations du client', 'fr')
  const reception = useLiveTranslation('Contact de la réception', 'fr')
  const stayInfo = useLiveTranslation('Informations du séjour', 'fr')
  const wifiInfo = useLiveTranslation('Informations wifi', 'fr')
  const pledgeTitle = useLiveTranslation('Engagement du client', 'fr')
  const pledge = useLiveTranslation(
    'Je reconnais avoir pris connaissance du règlement intérieur de l’établissement et m’engage à le respecter durant toute la durée de mon séjour.',
    'fr',
  )
  const guestSign = useLiveTranslation('Signature du client', 'fr')
  const receptionSign = useLiveTranslation('Signature de la réception', 'fr')
  const signLabel = useLiveTranslation('Signature', 'fr')
  const thanks = useLiveTranslation('MERCI ET BIENVENUE CHEZ IMPÉRIAL HOME !', 'fr')

  return (
    <article className="housing-a4 text-[#111]">
      <header className="housing-header relative bg-black px-[4%] pt-[4%] pb-[7%] text-[#d4af6a]">
        <div className="grid grid-cols-[1.05fr_0.95fr] items-start gap-[3%]">
          <div className="min-w-0">
            <ImperialMark className="mx-auto h-[18cqi] w-auto max-h-24" />
            <div className="housing-wordmark mt-1">
              <ImperialWordmark light compact />
            </div>
            <p className="mt-1 text-center text-[0.62em] tracking-[0.14em] text-[#d4af6a]">
              L&apos;ART DU SOIN. L&apos;ESPRIT DU DÉTAIL.
            </p>
          </div>
          <div className="min-w-0 pt-[4%] text-center">
            <h1 className="font-display text-[1.55em] leading-[0.95] tracking-[0.04em] text-[#d4af6a]">
              FICHE DE
              <br />
              LOGEMENT
            </h1>
            <p className="mx-auto mt-1 h-px w-10 bg-[#d4af6a]" />
            <p className="mt-2 text-[0.72em] leading-snug tracking-wide text-[#d4af6a]">{sheetLead}</p>
          </div>
        </div>
        <svg className="absolute inset-x-0 -bottom-px h-[4cqi] w-full text-white" viewBox="0 0 800 28" preserveAspectRatio="none" aria-hidden>
          <path d="M0 28 C180 0 620 0 800 28 L800 28 L0 28 Z" fill="currentColor" />
        </svg>
      </header>

      <div className="space-y-[3.5%] bg-white px-[3.5%] pt-[4%] pb-[4%]">
        <div className="grid grid-cols-2 gap-[3%]">
          <section className="housing-card">
            <div className="housing-card-cap">
              <SectionCapsule icon={UserRound}>{clientInfo}</SectionCapsule>
            </div>
            <div className="space-y-[0.55em]">
              <DottedField icon={UserRound} label="Nom :" value={data.guest_name} disabled={locked('guest_name')} onChange={(v) => set('guest_name', v)} />
              <DottedField icon={Phone} label="Téléphone :" value={data.guest_phone} disabled={locked('guest_phone')} onChange={(v) => set('guest_phone', v)} />
              <DottedField icon={IdCard} label="N° CNI :" value={data.guest_cni} disabled={locked('guest_cni')} onChange={(v) => set('guest_cni', v)} />
            </div>
          </section>

          <section className="housing-card">
            <div className="housing-card-cap housing-card-cap-center">
              <SectionCapsule icon={Phone}>{reception}</SectionCapsule>
            </div>
            <div className="flex flex-col items-center pt-[0.2em]">
              <ImperialMark className="h-[14cqi] w-auto max-h-16" />
              <p className="mt-0.5 font-display text-[0.85em] tracking-[0.22em] text-[#c4a35a]">IMPÉRIAL</p>
              <p className="text-[0.55em] tracking-[0.32em] text-[#c4a35a]">HOME</p>
              <div className="mt-[0.6em] flex items-center gap-1.5">
                <span className="flex h-[1.7em] w-[1.7em] items-center justify-center rounded-full border border-[#c4a35a] text-[#c4a35a]">
                  <Phone className="h-[0.9em] w-[0.9em]" />
                </span>
                <input
                  value={data.reception_phone}
                  disabled={locked('reception_phone')}
                  onChange={(e) => set('reception_phone', e.target.value)}
                  className="w-[7.2em] border-0 bg-transparent text-[1.05em] font-semibold tracking-wide text-[#111] outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        <section className="housing-card">
          <div className="housing-card-cap">
            <SectionCapsule icon={CalendarDays}>{stayInfo}</SectionCapsule>
          </div>
          <div className="grid grid-cols-2 gap-0">
            <div className="space-y-[0.45em] border-r border-dotted border-[#c4a35a] pr-[4%]">
              <DottedField icon={CalendarDays} label="Date d'arrivée :" type="date" value={data.arrival_date} disabled={locked('arrival_date')} onChange={(v) => set('arrival_date', v)} />
              <DottedField label="Heure d'arrivée :" type="time" value={data.arrival_time} disabled={locked('arrival_time')} onChange={(v) => set('arrival_time', v)} />
            </div>
            <div className="space-y-[0.45em] pl-[4%]">
              <DottedField icon={CalendarDays} label="Date de départ :" type="date" value={data.departure_date} disabled={locked('departure_date')} onChange={(v) => set('departure_date', v)} />
              <DottedField label="Heure de départ :" type="time" value={data.departure_time} disabled={locked('departure_time')} onChange={(v) => set('departure_time', v)} />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-[0.35em]">
            <SectionCapsule icon={Wifi}>{wifiInfo}</SectionCapsule>
          </div>
          <div className="housing-box grid grid-cols-2 gap-0 px-[3%] py-[0.7em]">
            <DottedField label="Nom du wifi :" value={data.wifi_name} disabled={locked('wifi_name')} onChange={(v) => set('wifi_name', v)} className="pr-[4%]" />
            <DottedField label="Mot de passe :" value={data.wifi_password} disabled={locked('wifi_password')} onChange={(v) => set('wifi_password', v)} className="border-l border-dotted border-[#c4a35a] pl-[4%]" />
          </div>
        </section>

        <section className="housing-card">
          <div className="housing-card-cap">
            <SectionCapsule icon={ShieldCheck}>{pledgeTitle}</SectionCapsule>
          </div>
          <p className="text-center text-[0.78em] leading-snug text-[#333]">{pledge}</p>
          <div className="mt-[0.6em] grid grid-cols-2 gap-[3%]">
            <div className="housing-box p-[0.45em]">
              <p className="mb-1 text-center text-[0.62em] tracking-[0.12em] text-[#8a7344] uppercase">{guestSign}</p>
              <DottedField label="Nom :" value={data.guest_sign_name} disabled={locked('guest_sign_name')} onChange={(v) => set('guest_sign_name', v)} />
              <div className="mt-1">
                <SignaturePad
                  label={signLabel}
                  value={data.guest_signature}
                  disabled={locked('guest_signature')}
                  onChange={(v) => set('guest_signature', v)}
                  compact
                />
              </div>
            </div>
            <div className="housing-box p-[0.45em]">
              <p className="mb-1 text-center text-[0.62em] tracking-[0.12em] text-[#8a7344] uppercase">{receptionSign}</p>
              <DottedField label="Nom :" value={data.reception_sign_name} disabled={locked('reception_sign_name')} onChange={(v) => set('reception_sign_name', v)} />
              <div className="mt-1">
                <SignaturePad
                  label={signLabel}
                  value={data.reception_signature}
                  disabled={locked('reception_signature')}
                  onChange={(v) => set('reception_signature', v)}
                  compact
                />
              </div>
            </div>
          </div>
          <div className="mt-[0.55em]">
            <DottedField
              label="Nom de la réceptionniste :"
              value={data.receptionist_name}
              disabled={locked('receptionist_name')}
              onChange={(v) => set('receptionist_name', v)}
            />
          </div>
        </section>
      </div>

      <footer className="bg-black px-[3%] pt-[0.8em] pb-[0.7em] text-[#d4af6a]">
        <div className="grid grid-cols-4">
          <FooterPill icon={Shield} title="Sécurité 24h/24" text="Votre sécurité est notre priorité." />
          <FooterPill icon={Wifi} title="Wifi haut débit" text="Restez connecté en toute simplicité." />
          <FooterPill icon={Sparkles} title="Service ménage" text="Confort et propreté au quotidien." />
          <FooterPill icon={Phone} title="Assistance" text="Équipe à votre écoute à tout moment." />
        </div>
        <p className="mt-[0.55em] text-center font-display text-[0.72em] tracking-[0.12em] text-[#d4af6a]">{thanks}</p>
      </footer>
    </article>
  )
}

function FooterPill({ icon: Icon, title, text }: { icon: typeof Shield; title: string; text: string }) {
  const shownTitle = useLiveTranslation(title, 'fr')
  const shownText = useLiveTranslation(text, 'fr')
  return (
    <div className="px-0.5 text-center">
      <Icon className="mx-auto mb-0.5 h-[1.1em] w-[1.1em]" strokeWidth={1.4} />
      <p className="text-[0.58em] leading-tight tracking-[0.04em] uppercase">{shownTitle}</p>
      <p className="mt-0.5 text-[0.52em] leading-tight text-[#d4af6a]/80">{shownText}</p>
    </div>
  )
}
