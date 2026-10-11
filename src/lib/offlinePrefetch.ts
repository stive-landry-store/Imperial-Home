import type { QueryClient } from '@tanstack/react-query'
import { fetchPromotions, fetchPropertyBySlug, fetchPublishedProperties, fetchSiteConfig } from './data'
import { fetchPublishedReviews, fetchRatings } from './guest'
import { fetchPropertyIndex } from './matricule'
import { optimizeRemoteImage } from './media'
import { fetchPublishedVehicles, fetchVehicleBySlug } from './vehicles'

const READY_KEY = 'ih-offline-ready'
const IMAGE_CACHE = 'imperial-home-images-v1'
const REFRESH_MS = 6 * 3_600_000
const MAX_IMAGES = 220

export function offlineReadyAt() {
  try {
    return Number(localStorage.getItem(READY_KEY) ?? 0)
  } catch {
    return 0
  }
}

async function cacheImages(urls: string[]) {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(IMAGE_CACHE)
  const queue = [...new Set(urls.filter(Boolean))].slice(0, MAX_IMAGES)
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        if (await cache.match(url)) continue
        const response = await fetch(url, { mode: 'cors' })
        if (response.ok) await cache.put(url, response)
      } catch {
        /* an unreachable image is simply not available offline */
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}

/** Download everything the public pages need so the app can be browsed without a connection. */
export async function warmOfflineData(client: QueryClient, force = false) {
  if (typeof navigator === 'undefined' || !navigator.onLine) return false
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  if (saveData && !force) return false
  if (!force && Date.now() - offlineReadyAt() < REFRESH_MS) return false

  const fresh = { staleTime: 0 }
  const [config, properties, vehicles] = await Promise.all([
    client.fetchQuery({ queryKey: ['site-config'], queryFn: fetchSiteConfig, ...fresh }),
    client.fetchQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties, ...fresh }),
    client.fetchQuery({ queryKey: ['vehicles'], queryFn: fetchPublishedVehicles, ...fresh }),
    client.fetchQuery({ queryKey: ['promotions'], queryFn: fetchPromotions, ...fresh }),
    client.fetchQuery({ queryKey: ['property-index'], queryFn: fetchPropertyIndex, ...fresh }),
    client.fetchQuery({ queryKey: ['reviews', 'ratings'], queryFn: fetchRatings, ...fresh }),
  ])

  const images: string[] = [config.home_hero_image_url, config.home_fiche_image_url]
  const add = (url: string | null | undefined) => {
    if (!url) return
    images.push(url)
    for (const width of [200, 500, 800, 1200]) images.push(optimizeRemoteImage(url, width))
  }

  await Promise.all(
    properties.map(async (property) => {
      const [detail] = await Promise.all([
        client.fetchQuery({ queryKey: ['property', property.slug], queryFn: () => fetchPropertyBySlug(property.slug), ...fresh }),
        client.fetchQuery({ queryKey: ['reviews', property.id], queryFn: () => fetchPublishedReviews(property.id), ...fresh }),
      ])
      for (const image of (detail ?? property).property_images ?? []) add(image.url)
    }),
  )
  await Promise.all(
    vehicles.map(async (vehicle) => {
      const detail = await client.fetchQuery({ queryKey: ['vehicle', vehicle.slug], queryFn: () => fetchVehicleBySlug(vehicle.slug), ...fresh })
      for (const media of (detail ?? vehicle).vehicle_media ?? []) if (media.media_type !== 'video') add(media.url)
    }),
  )

  await cacheImages(images)
  try {
    localStorage.setItem(READY_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('ih-offline-ready'))
  return true
}
