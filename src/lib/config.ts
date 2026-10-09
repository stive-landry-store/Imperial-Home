const DEFAULTS = {
  brand_name: 'Imperial Home',
  phone: '+237 674 09 22 63',
  whatsapp: '237674092263',
  email: 'imperialhome237@gmail.com',
  city: 'Douala, Cameroon',
  hold_minutes: '30',
  payment_instructions_en:
    'Pay the exact amount shown for your reservation via MTN Mobile Money or Orange Money, then send the receipt on WhatsApp to +237 674 09 22 63. Include your reservation code. An administrator will confirm the payment.',
  payment_instructions_fr:
    'Réglez le montant exact de votre réservation via MTN Mobile Money ou Orange Money, puis envoyez le reçu sur WhatsApp au +237 674 09 22 63. Indiquez votre code de réservation. Un administrateur confirmera le paiement.',
  home_fiche_image_url: '',
  home_hero_image_url: '',
  place_address: 'Impérial Home, Carrefour Conquête',
  place_latitude: '4.0689',
  place_longitude: '9.7568',
}

/** Fallback when no custom hero is set in admin. */
export const DEFAULT_HOME_HERO_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=80'

export const SITE_DEFAULTS = DEFAULTS

export function jsonText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value
  if (value == null) return fallback
  return String(value)
}
