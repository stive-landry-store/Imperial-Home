import { IMPERIAL_HOME } from './house'

const SAVED = 'ih-saved-place'

export type ImperialPlace = {
  latitude: number
  longitude: number
  address: string
  label: string
}

export function imperialPlace(config?: {
  place_latitude?: string
  place_longitude?: string
  place_address?: string
} | null): ImperialPlace {
  const latitude = Number(config?.place_latitude)
  const longitude = Number(config?.place_longitude)
  return {
    latitude: Number.isFinite(latitude) && Math.abs(latitude) > 0.01 ? latitude : IMPERIAL_HOME.latitude,
    longitude: Number.isFinite(longitude) && Math.abs(longitude) > 0.01 ? longitude : IMPERIAL_HOME.longitude,
    address: config?.place_address?.trim() || IMPERIAL_HOME.address,
    label: 'Impérial Home',
  }
}

export function placeLinks(place: ImperialPlace) {
  const query = `${place.latitude},${place.longitude}`
  const name = encodeURIComponent(`${place.label}, ${place.address}`)
  const google = `https://www.google.com/maps/search/?api=1&query=${query}`
  return {
    google,
    apple: `https://maps.apple.com/?ll=${query}&q=${name}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${place.label}\n${place.address}\n${google}`)}`,
    shareUrl: google,
  }
}

export function placeIsSaved() {
  return localStorage.getItem(SAVED) === '1'
}

export function savePlace() {
  localStorage.setItem(SAVED, '1')
}
