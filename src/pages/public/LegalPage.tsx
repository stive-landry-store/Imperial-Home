import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SITE_ORIGIN } from '../../lib/seo'
import { CREATOR } from '../../lib/credits'

// About, terms and privacy pages.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

type Kind = 'about' | 'terms' | 'privacy'
const PATHS: Record<Kind, string> = { about: '/a-propos', terms: '/conditions', privacy: '/confidentialite' }

export function LegalPage({ kind }: { kind: Kind }) {
  const { t } = useTranslation()
  const sections = t(`legal.${kind}.sections`, { returnObjects: true }) as { title: string; body: string }[]
  const list = Array.isArray(sections) ? sections : []
  return (
    <div className="theme-page mx-auto max-w-3xl px-4 pt-28 pb-20">
      <Helmet>
        <title>{`${t(`legal.${kind}.title`)} | Imperial Home`}</title>
        <meta name="description" content={t(`legal.${kind}.lead`)} />
        <link rel="canonical" href={`${SITE_ORIGIN}${PATHS[kind]}`} />
      </Helmet>
      <h1 className="font-display text-4xl">{t(`legal.${kind}.title`)}</h1>
      <p className="mt-3 theme-muted">{t(`legal.${kind}.lead`)}</p>
      <div className="mt-10 space-y-8">
        {list.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line theme-muted">{section.body}</p>
          </section>
        ))}
      </div>
      {kind === 'about' ? (
        <section className="ih-card theme-card mt-12 rounded-3xl border border-accent/30 p-6 text-center">
          <p className="text-xs tracking-[0.3em] text-accent uppercase">{t('credits.madeBy')}</p>
          <p className="ih-gold-text mt-3 font-display text-3xl">{CREATOR.company}</p>
          <p className="mt-2 text-sm theme-muted">
            {t('credits.creator')} : <span className="font-semibold">{CREATOR.fullName}</span>
          </p>
        </section>
      ) : null}
      <p className="mt-12 text-sm theme-muted">
        <Link to="/a-propos" className="ih-link">{t('legal.about.title')}</Link> ·{' '}
        <Link to="/conditions" className="ih-link">{t('legal.terms.title')}</Link> ·{' '}
        <Link to="/confidentialite" className="ih-link">{t('legal.privacy.title')}</Link>
      </p>
    </div>
  )
}
