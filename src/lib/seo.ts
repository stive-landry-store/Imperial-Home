import { IMPERIAL_HOME } from './house'
import { SITE_DEFAULTS } from './config'

export const SITE_ORIGIN = 'https://imperial-home.vercel.app'

/** Shown to search engines on the home page and in the first HTML they download. */
export const SITE_DESCRIPTION =
  'Imperial Home : appartements meublés à Carrefour Conquête, Douala. Réservation en ligne et location de voiture. WhatsApp +237 674 09 22 63.'

export function lodgingJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'Imperial Home',
    description: SITE_DESCRIPTION,
    url: `${SITE_ORIGIN}/`,
    telephone: SITE_DEFAULTS.phone,
    email: SITE_DEFAULTS.email,
    image: `${SITE_ORIGIN}/icon-512.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: IMPERIAL_HOME.neighborhood,
      addressLocality: IMPERIAL_HOME.city,
      addressCountry: 'CM',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: IMPERIAL_HOME.latitude,
      longitude: IMPERIAL_HOME.longitude,
    },
    areaServed: 'Douala',
  }
}
