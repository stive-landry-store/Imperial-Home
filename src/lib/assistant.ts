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
        ? `Bien sûr. Écrivez ici, ou sur WhatsApp au ${input.phone}. Quelqu’un de la maison vous répond.`
        : `Of course. Write here, or on WhatsApp at ${input.phone}. Someone from the house will reply.`,
    }
  }

  if (/voiture|car|vehicle|chauffeur|driver|location auto/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Oui, la voiture se réserve seule. Ouvrez Location voiture, choisissez le modèle et les dates. Si vous avez déjà un appartement, on peut l’ajouter au séjour.'
        : 'Yes, the car can be booked on its own. Open Car rental, pick the car and the dates. If you already have an apartment, we can add it to the stay.',
    }
  }

  if (/bot|assistant|aide|help|comment/.test(q) && q.length < 40) {
    return {
      escalate: false,
      answer: fr
        ? 'Dites-moi ce que vous cherchez : un appartement, une date, ou une voiture. Si je ne sais pas, je passe le message à la réception.'
        : 'Tell me what you need: an apartment, a date, or a car. If I don’t know, I’ll pass it to reception.',
    }
  }

  if (/book|reserv|disponib|available|calendar|calendrier/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Regardez la fiche de l’appartement : choisissez le jour d’arrivée et le nombre de nuits. Si les dates sont libres, la demande part tout de suite.'
        : 'Open the apartment page, choose the arrival day and the number of nights. If the dates are free, the request goes through.',
    }
  }

  if (input.isStaff && /admin|réservation|reservation|annul|cancel/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Le calendrier montre les séjours. Ouvrez une réservation pour la confirmer ou l’annuler.'
        : 'The calendar shows the stays. Open a reservation to confirm it or cancel it.',
    }
  }

  const match = input.properties.find(
    (p) => q.includes(p.slug) || q.includes(p.name.toLowerCase()) || (p.neighborhood && q.includes(p.neighborhood.toLowerCase())),
  )
  if (match) {
    const amenities = (match.property_amenities ?? [])
      .map((a) => localized(a.amenities.name_en, a.amenities.name_fr, input.lang))
      .join(', ')
    return {
      escalate: false,
      answer: fr
        ? `${match.name}, à ${match.city}. ${match.capacity} personnes, ${formatXaf(match.nightly_rate_xaf)} la nuit.${amenities ? ` Dedans : ${amenities}.` : ''}`
        : `${match.name}, in ${match.city}. ${match.capacity} people, ${formatXaf(match.nightly_rate_xaf)} a night.${amenities ? ` Inside: ${amenities}.` : ''}`,
    }
  }

  if (/price|tarif|coût|cost|xaf|prix/.test(q)) {
    const list = input.properties.map((p) => `${p.name}: ${formatXaf(p.nightly_rate_xaf)}/nuit`).join('\n')
    return {
      escalate: false,
      answer: fr ? `Les prix à la nuit :\n${list}` : `Nightly prices:\n${list}`,
    }
  }

  if (/wifi|wi-fi|rule|règle|check-in|checkout|départ|arrivée/.test(q)) {
    return {
      escalate: false,
      answer: fr
        ? 'Le mot de passe Wi-Fi est dans l’appartement, une fois le séjour confirmé. On arrive vers 14 h, on part vers 11 h.'
        : 'The Wi-Fi password is in the apartment once the stay is confirmed. Arrival around 2 pm, departure around 11 am.',
    }
  }

  if (/my booking|ma réservation|reservation code|code/.test(q) && input.reservations.length) {
    const lines = input.reservations
      .slice(0, 3)
      .map((r) => `${r.public_code}: ${r.check_in} → ${r.check_out} (${r.status})`)
      .join('\n')
    return {
      escalate: false,
      answer: fr ? `Vos séjours :\n${lines}` : `Your stays:\n${lines}`,
    }
  }

  if (/\[.*capture|screenshot|image/.test(q)) {
    return {
      escalate: true,
      answer: fr
        ? 'Photo bien reçue. Dites en une phrase ce que vous voulez, je la passe à la réception.'
        : 'Photo received. Tell me in one sentence what you need, and I’ll pass it to reception.',
    }
  }

  if (input.properties.length) {
    const names = input.properties.map((p) => p.name).join(', ')
    return {
      escalate: true,
      answer: fr
        ? `Je passe ça à la réception. En attendant, les appartements ouverts sont : ${names}.`
        : `I’ll pass this to reception. Meanwhile, the open apartments are: ${names}.`,
    }
  }

  return {
    escalate: true,
    answer: fr
      ? `Je n’ai pas ça sous la main. J’en parle à la réception, ou écrivez sur WhatsApp.`
      : `I don’t have that here. I’ll ask reception, or you can write on WhatsApp.`,
  }
}
