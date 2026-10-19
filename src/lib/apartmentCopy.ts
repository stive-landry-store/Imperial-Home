import { formatXaf } from './format'
import { IMPERIAL_HOME } from './house'
import type { Property } from '../types/database'

const sharedLine = /tr[eè]s grande chambre|very large bedroom|grand salon|large living room/i

export function apartmentSummary(property: Pick<Property, 'name' | 'capacity' | 'nightly_rate_xaf' | 'description_fr' | 'description_en'>, lang: string) {
  const own = lang.startsWith('fr') ? property.description_fr : property.description_en
  if (own && own.trim() && !sharedLine.test(own)) return own.trim()
  return lang.startsWith('fr')
    ? `${property.name}, au ${IMPERIAL_HOME.neighborhood}. ${property.capacity} personnes, ${formatXaf(property.nightly_rate_xaf)} la nuit.`
    : `${property.name}, at ${IMPERIAL_HOME.neighborhood}. ${property.capacity} people, ${formatXaf(property.nightly_rate_xaf)} a night.`
}
