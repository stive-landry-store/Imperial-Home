import { SITE_DEFAULTS } from './config'
import { IMPERIAL_HOME } from './house'
import type { Amenity, DateRange, Promotion, Property, Quote, SiteConfig } from '../types/database'
import { quoteStay } from './pricing'
import { stayIsAvailable } from './availability'

const amenities: Amenity[] = [
  { id: 'a1', slug: 'wifi', name_en: 'Wi-Fi', name_fr: 'Wi-Fi', icon: 'wifi' },
  { id: 'a2', slug: 'ac', name_en: 'Air conditioning', name_fr: 'Climatisation', icon: 'snowflake' },
  { id: 'a3', slug: 'kitchen', name_en: 'Equipped kitchen', name_fr: 'Cuisine équipée', icon: 'utensils' },
  { id: 'a4', slug: 'tv', name_en: 'Smart TV', name_fr: 'TV intelligente', icon: 'tv' },
  { id: 'a5', slug: 'parking', name_en: 'Parking', name_fr: 'Parking', icon: 'car' },
  { id: 'a6', slug: 'security', name_en: '24h security', name_fr: 'Sécurité 24h', icon: 'shield' },
  { id: 'a7', slug: 'workspace', name_en: 'Workspace', name_fr: 'Espace de travail', icon: 'laptop' },
  { id: 'a8', slug: 'hot-water', name_en: 'Hot water', name_fr: 'Eau chaude', icon: 'droplets' },
  { id: 'a9', slug: 'washer', name_en: 'Washing machine', name_fr: 'Machine à laver', icon: 'washing-machine' },
  { id: 'a10', slug: 'generator', name_en: 'Generator', name_fr: 'Groupe électrogène', icon: 'zap' },
]

function amenityLinks(slugs: string[]) {
  return slugs
    .map((slug) => amenities.find((a) => a.slug === slug))
    .filter((a): a is Amenity => Boolean(a))
    .map((amenities) => ({ amenities }))
}

function roomBase(id: string, slug: string, name: string, rate: number, capacity: number): Omit<Property, 'description_en' | 'description_fr' | 'property_images' | 'property_amenities'> {
  return {
    id,
    slug,
    name,
    welcome_message_en: `Welcome to the ${name} room at Impérial Home.`,
    welcome_message_fr: `Bienvenue dans la chambre ${name} à Impérial Home.`,
    address: IMPERIAL_HOME.address,
    city: IMPERIAL_HOME.city,
    neighborhood: IMPERIAL_HOME.neighborhood,
    country: IMPERIAL_HOME.country,
    latitude: IMPERIAL_HOME.latitude,
    longitude: IMPERIAL_HOME.longitude,
    capacity,
    bedrooms: 1,
    bathrooms: 1,
    living_areas: 0,
    kitchen_info_en: 'Shared kitchen and living areas at Impérial Home.',
    kitchen_info_fr: 'Cuisine et espaces communs partagés à Impérial Home.',
    rules_en: 'No parties. No smoking indoors. Quiet hours 22:00–07:00. Respect other guests.',
    rules_fr: 'Pas de fêtes. Interdiction de fumer à l’intérieur. Silence 22h00–07h00. Respectez les autres hôtes.',
    safety_info_en: 'Fire extinguisher on each floor. First-aid kit at reception.',
    safety_info_fr: 'Extincteur à chaque étage. Trousse de secours à la réception.',
    equipment_instructions_en: 'Room details and Wi-Fi are in your housing sheet after booking.',
    equipment_instructions_fr: 'Les détails de la chambre et le Wi-Fi sont dans votre fiche logement après réservation.',
    check_in_time: '14:00:00',
    check_out_time: '11:00:00',
    nightly_rate_xaf: rate,
    recommendations_en: 'Shops and the main road are a few minutes from Carrefour Conquête.',
    recommendations_fr: 'Les boutiques et la route principale sont à quelques minutes du Carrefour Conquête.',
    status: 'published',
  }
}

export const demoConfig: SiteConfig = { ...SITE_DEFAULTS }

export const demoProperties: Property[] = [
  {
    ...roomBase('p1', 'abidjan', 'Abidjan', 55_000, 2),
    description_en:
      'The Abidjan apartment at Impérial Home — warm tones, soft light, and a calm atmosphere for couples or solo travellers.',
    description_fr:
      'L’appartement Abidjan à Impérial Home — tons chauds, lumière douce et ambiance paisible pour couples ou voyageurs seuls.',
    property_images: [
      {
        id: 'i1',
        property_id: 'p1',
        url: 'https://images.unsplash.com/photo-1616594039964-bdfa8af9ee78?auto=format&fit=crop&w=1600&q=80',
        storage_path: null,
        alt_en: 'Abidjan apartment',
        alt_fr: 'Appartement Abidjan',
        sort_order: 0,
        is_cover: true,
      },
    ],
    property_amenities: amenityLinks(['wifi', 'ac', 'tv', 'security', 'hot-water']),
  },
  {
    ...roomBase('p2', 'singapour', 'Singapour', 65_000, 2),
    description_en:
      'The Singapour apartment — contemporary lines, city-inspired décor, and a refined stay inside Impérial Home.',
    description_fr:
      'L’appartement Singapour — lignes contemporaines, décor inspiré de la ville et séjour raffiné à Impérial Home.',
    property_images: [
      {
        id: 'i2',
        property_id: 'p2',
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
        storage_path: null,
        alt_en: 'Singapour apartment',
        alt_fr: 'Appartement Singapour',
        sort_order: 0,
        is_cover: true,
      },
    ],
    property_amenities: amenityLinks(['wifi', 'ac', 'tv', 'workspace', 'hot-water']),
  },
  {
    ...roomBase('p3', 'dubai', 'Dubai', 75_000, 3),
    description_en:
      'The Dubai apartment — our most spacious unit at Impérial Home, ideal for small families or longer stays.',
    description_fr:
      'L’appartement Dubai — notre appartement le plus spacieux à Impérial Home, idéal pour les petites familles ou les longs séjours.',
    property_images: [
      {
        id: 'i3',
        property_id: 'p3',
        url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80',
        storage_path: null,
        alt_en: 'Dubai apartment',
        alt_fr: 'Appartement Dubai',
        sort_order: 0,
        is_cover: true,
      },
    ],
    property_amenities: amenityLinks(['wifi', 'ac', 'tv', 'parking', 'security', 'hot-water', 'workspace']),
  },
]

export const demoPromotions: Promotion[] = [
  {
    id: 'promo1',
    name: 'Ouverture Impérial Home',
    description_en: 'Introductory offer on selected apartments at Impérial Home.',
    description_fr: 'Offre d’ouverture sur certains appartements à Impérial Home.',
    discount_type: 'percent',
    discount_value: 10,
    starts_at: '2026-01-01',
    ends_at: '2026-12-31',
    is_active: true,
    promotion_properties: [{ property_id: 'p1' }],
  },
]

export const demoUnavailable: Record<string, DateRange[]> = {
  p1: [{ start_date: '2026-09-10', end_date: '2026-09-14', kind: 'reservation' }],
}

export function demoQuote(property: Property, checkIn: string, checkOut: string, guests: number): Quote {
  const nights = Math.round(
    (Date.parse(checkOut + 'T00:00:00') - Date.parse(checkIn + 'T00:00:00')) / 86_400_000,
  )
  const money = quoteStay(property.nightly_rate_xaf, nights, null)
  const ranges = demoUnavailable[property.id] ?? []
  return {
    ...money,
    nightly_rate_xaf: property.nightly_rate_xaf,
    promotion_name: null,
    capacity: property.capacity,
    available:
      nights >= 1 &&
      guests >= 1 &&
      guests <= property.capacity &&
      stayIsAvailable(checkIn, checkOut, ranges),
  }
}
