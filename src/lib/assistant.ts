import type { Property, Reservation } from '../types/database'
import { formatXaf, localized } from './format'

export function groundedReply(input: {
  question: string
  lang: string
  properties: Property[]
  reservations: Reservation[]
  phone: string
  email: string
  isStaff?: boolean
}): { answer: string; escalate: boolean } {
  const fr = input.lang.startsWith('fr')
  const q = input.question.toLowerCase()
  const wantsHuman = /human|person|agent|manager|whatsapp|call|parler|conseiller|administrateur/.test(q)
  if (wantsHuman) {
    return {
      escalate: true,
      answer: fr
        ? `Un administrateur Impérial Home peut vous aider. WhatsApp ${input.phone} ou ${input.email}.`
        : `An Imperial Home administrator can help. WhatsApp ${input.phone} or ${input.email}.`,
    }
  }

  if (/voiture|car|vehicle|chauffeur|driver|location auto/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Vous pouvez réserver une voiture seule, sans appartement : ouvrez « Location voiture », choisissez le véhicule, parcourez toutes ses photos, puis les dates. Vous pouvez aussi ajouter une voiture à une réservation d’appartement. Un code promo valide donne 5 % de réduction.'
        : 'You can book a car on its own, without an apartment: open Car rental, choose the vehicle, browse every photo, then pick the dates. You can also add a car to an apartment booking. A valid promo code gives 5% off.',
    }
  }

  if (/bot|assistant|aide|help|comment/.test(q) && q.length < 40) {
    return {
      escalate: false,
      answer: fr
        ? 'Je suis le bot Imperial-Home. Posez vos questions sur les appartements, les prix, les réservations ou les voitures. Vous pouvez joindre une capture d’écran avec l’icône image.'
        : 'I am the Imperial-Home bot. Ask about apartments, prices, bookings, or cars. Attach a screenshot with the image icon.',
    }
  }

  if (/book|reserv|disponib|available|calendar|calendrier/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Les disponibilités sont vérifiées en direct pour chaque appartement. Choisissez la date d’arrivée et le nombre de nuits : deux clients ne peuvent pas confirmer les mêmes dates sur le même appartement.'
        : 'Availability is checked live per apartment. Pick check-in and number of nights — two guests cannot confirm the same dates on the same unit.',
    }
  }

  if (input.isStaff && /admin|réservation|reservation|annul|cancel/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Dans l’admin : Calendrier pour voir toutes les réservations, détail réservation pour confirmer/refuser paiement ou annuler. Page Administrateurs pour nommer un admin (main admin).'
        : 'In admin: Calendar for all bookings, reservation detail to confirm/reject payment or cancel. Administrators page to appoint admins (main admin).',
    }
  }

  const match = input.properties.find(
    (p) => q.includes(p.slug) || q.includes(p.name.toLowerCase()) || (p.neighborhood && q.includes(p.neighborhood.toLowerCase())),
  )
  if (match) {
    const desc = localized(match.description_en, match.description_fr, input.lang)
    const amenities = (match.property_amenities ?? [])
      .map((a) => localized(a.amenities.name_en, a.amenities.name_fr, input.lang))
      .join(', ')
    return {
      escalate: false,
      answer: fr
        ? `${match.name} à Impérial Home · ${match.city}. Capacité ${match.capacity} voyageurs. À partir de ${formatXaf(match.nightly_rate_xaf)}/nuit. ${amenities ? `Équipements : ${amenities}.` : ''} ${desc}`
        : `${match.name} at Imperial Home · ${match.city}. Capacity ${match.capacity} guests. From ${formatXaf(match.nightly_rate_xaf)}/night. ${amenities ? `Amenities: ${amenities}.` : ''} ${desc}`,
    }
  }

  if (/price|tarif|coût|cost|xaf|prix/.test(q)) {
    const list = input.properties.map((p) => `${p.name}: ${formatXaf(p.nightly_rate_xaf)}/nuit`).join('\n')
    return {
      escalate: false,
      answer: fr ? `Tarifs publiés (promotions possibles au paiement) :\n${list}` : `Published rates (promotions may apply):\n${list}`,
    }
  }

  if (/wifi|wi-fi|rule|règle|check-in|checkout|départ|arrivée/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Wi‑Fi et consignes après confirmation du paiement. Arrivée 14h, départ 11h. Règlement sur chaque fiche appartement.'
        : 'Wi‑Fi and instructions after payment confirmation. Check-in 14:00, check-out 11:00. Rules on each apartment page.',
    }
  }

  if (/my booking|ma réservation|reservation code|code/.test(q) && input.reservations.length) {
    const lines = input.reservations
      .slice(0, 3)
      .map((r) => `${r.public_code}: ${r.check_in} → ${r.check_out} (${r.status})`)
      .join('\n')
    return {
      escalate: false,
      answer: fr ? `Vos réservations récentes :\n${lines}` : `Your recent reservations:\n${lines}`,
    }
  }

  if (/\[.*capture|screenshot|image/.test(q)) {
    return {
      escalate: true,
      answer: fr
        ? 'Merci pour la capture. Un administrateur pourra la consulter dans la messagerie. En attendant, décrivez votre question en une phrase.'
        : 'Thanks for the screenshot. An administrator can review it in messaging. Meanwhile, describe your question in one sentence.',
    }
  }

  if (input.properties.length) {
    const names = input.properties.map((p) => p.name).join(', ')
    return {
      escalate: false,
      answer: fr
        ? `Impérial Home à Douala : ${names}. Demandez un appartement, un tarif ou la location voiture. Contact : ${input.phone}.`
        : `Imperial Home in Douala: ${names}. Ask about an apartment, pricing, or car rental. Contact: ${input.phone}.`,
    }
  }

  return {
    escalate: true,
    answer: fr
      ? `Je n’ai pas cette information. WhatsApp ${input.phone} ou écrivez à ${input.email}.`
      : `I do not have that information. WhatsApp ${input.phone} or email ${input.email}.`,
  }
}
