import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Baby,
  Bot,
  Building2,
  Clock,
  Cookie,
  Database,
  Globe,
  Lock,
  Mail,
  MessageCircle,
  Printer,
  RefreshCw,
  Scale,
  Share2,
  ShieldCheck,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Live } from '../../components/i18n/Live'
import { SITE_ORIGIN } from '../../lib/seo'
import { whatsappUrl } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'
import {
  PRIVACY_CONTACT,
  PRIVACY_LEAD,
  PRIVACY_PROMISES,
  PRIVACY_SECTIONS,
  PRIVACY_UPDATED,
  type PrivacyBlock,
  type PrivacyIcon,
} from '../../lib/privacyPolicy'

// Politique de confidentialité d'Imperial Home.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

const ICONS: Record<PrivacyIcon, LucideIcon> = {
  building: Building2,
  database: Database,
  target: Target,
  bot: Bot,
  share: Share2,
  globe: Globe,
  clock: Clock,
  lock: Lock,
  scale: Scale,
  cookie: Cookie,
  baby: Baby,
  refresh: RefreshCw,
  mail: Mail,
}

const TONES = ['ih-tone-a', 'ih-tone-b', 'ih-tone-c', 'ih-tone-e', 'ih-tone-d']

function Block({ block }: { block: PrivacyBlock }) {
  if (block.kind === 'p') {
    return (
      <p className="leading-relaxed theme-muted">
        <Live text={block.text} from="fr" />
      </p>
    )
  }
  return (
    <ul className="ih-privacy-list space-y-2.5">
      {block.items.map((item, index) => (
        <li key={index} className="flex gap-3 leading-relaxed">
          <span className="ih-privacy-dot mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" aria-hidden />
          <span className="theme-muted">
            {item.label ? (
              <span className="font-semibold text-[var(--page-fg)]">
                <Live text={item.label} from="fr" />
                {' : '}
              </span>
            ) : null}
            <Live text={item.text} from="fr" />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function PrivacyPage() {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState(PRIVACY_SECTIONS[0].id)
  const updated = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(PRIVACY_UPDATED))

  // Highlight the section being read in the table of contents.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -65% 0px' },
    )
    PRIVACY_SECTIONS.forEach((section) => {
      const node = document.getElementById(section.id)
      if (node) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="theme-page ih-privacy pb-24">
      <Helmet>
        <title>{`${t('legal.privacy.title')} | Imperial Home`}</title>
        <meta name="description" content={PRIVACY_LEAD} />
        <link rel="canonical" href={`${SITE_ORIGIN}/confidentialite`} />
        <meta property="og:title" content={`${t('legal.privacy.title')} | Imperial Home`} />
        <meta property="og:description" content={PRIVACY_LEAD} />
      </Helmet>

      <header className="ih-privacy-hero relative overflow-hidden px-4 pt-28 pb-14 md:px-6 md:pt-36 md:pb-20">
        <div className="ih-orb ih-orb-a" aria-hidden />
        <div className="ih-orb ih-orb-b" aria-hidden />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="ih-privacy-shield mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--card-bg)] text-accent shadow-[var(--shadow-lift)]">
            <ShieldCheck className="h-8 w-8" strokeWidth={1.6} />
          </span>
          <p className="ih-eyebrow mt-6 justify-center">Imperial Home</p>
          <h1 className="mt-3 text-4xl md:text-6xl">{t('legal.privacy.title')}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed theme-muted md:text-lg">
            <Live text={PRIVACY_LEAD} from="fr" />
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-[var(--card-bg)] px-4 py-1.5 text-sm theme-muted">
            <RefreshCw className="h-3.5 w-3.5 text-accent" />
            <Live text="Dernière mise à jour" from="fr" /> : <span className="font-semibold text-[var(--page-fg)]">{updated}</span>
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 md:px-6" aria-label="En bref">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIVACY_PROMISES.map((promise, index) => {
            const Icon = ICONS[promise.icon]
            return (
              <div
                key={promise.title}
                data-reveal="up"
                style={{ ['--ih-i' as string]: index }}
                className="ih-pillar rounded-3xl border border-line bg-[var(--page-alt)] p-5"
              >
                <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', TONES[index % TONES.length])}>
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <p className="mt-4 font-semibold">
                  <Live text={promise.title} from="fr" />
                </p>
                <p className="mt-1 text-sm leading-relaxed theme-muted">
                  <Live text={promise.text} from="fr" />
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mx-auto mt-14 grid max-w-6xl gap-10 px-4 md:px-6 lg:grid-cols-[260px_1fr]">
        <nav className="ih-privacy-toc hidden self-start lg:sticky lg:top-28 lg:block" aria-label="Sommaire">
          <p className="ih-set-title !mt-0">
            <Live text="Sommaire" from="fr" />
          </p>
          <ol className="space-y-1">
            {PRIVACY_SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn('ih-toc-link flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm', active === section.id ? 'is-active' : 'theme-muted')}
                  onClick={(event) => {
                    event.preventDefault()
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    history.replaceState(null, '', `#${section.id}`)
                  }}
                >
                  <span className="ih-toc-num grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold">{index + 1}</span>
                  <span className="min-w-0">
                    <Live text={section.title} from="fr" />
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="ih-btn mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-accent-soft"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            <Live text="Imprimer" from="fr" />
          </button>
        </nav>

        <div className="min-w-0 space-y-5">
          {PRIVACY_SECTIONS.map((section, index) => {
            const Icon = ICONS[section.icon]
            return (
              <section key={section.id} id={section.id} className="ih-privacy-section theme-card scroll-mt-28 p-5 md:p-8">
                <div className="flex items-center gap-3">
                  <span className={cn('ih-privacy-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl', TONES[index % TONES.length])}>
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-accent uppercase">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h2 className="text-2xl md:text-[1.75rem]">
                      <Live text={section.title} from="fr" />
                    </h2>
                  </div>
                </div>
                <div className="mt-5 space-y-4 text-[15px] md:text-base">
                  {section.blocks.map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} />
                  ))}
                </div>
                {section.id === 'contact' ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href={`mailto:${PRIVACY_CONTACT.email}`} className="ih-btn ih-btn-primary inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold">
                      <Mail className="h-4 w-4" />
                      {PRIVACY_CONTACT.email}
                    </a>
                    <a
                      href={whatsappUrl('237674092263')}
                      target="_blank"
                      rel="noreferrer"
                      className="ih-btn inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold hover:bg-accent-soft"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                ) : null}
              </section>
            )
          })}

          <p className="pt-4 text-sm theme-muted">
            <Link to="/a-propos" className="ih-link">
              {t('legal.about.title')}
            </Link>{' '}
            ·{' '}
            <Link to="/conditions" className="ih-link">
              {t('legal.terms.title')}
            </Link>{' '}
            · <span className="font-semibold text-accent">{t('legal.privacy.title')}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
