const CACHE = 'imperial-home-v6'
const IMAGES = 'imperial-home-images-v1'
const FONTS = 'imperial-home-fonts-v1'
const KEEP = [CACHE, IMAGES, FONTS]
const SHELL = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/brand/imperial-monogram.png',
  '/hero-accueil.jpg?v=2',
]
const MAX_IMAGES = 400

async function precacheShell() {
  const cache = await caches.open(CACHE)
  const page = await fetch('/', { cache: 'reload' })
  const html = await page.clone().text()
  await cache.put('/', page)
  const assets = new Set(SHELL)
  for (const match of html.matchAll(/(?:src|href)="(\/(?:assets\/|brand\/)[^"]+)"/g)) assets.add(match[1])
  await Promise.allSettled(
    [...assets].map(async (path) => {
      const response = await fetch(path, { cache: 'reload' })
      if (response.ok) await cache.put(path, response)
    }),
  )
}

async function trim(name, max) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  for (const request of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(request)
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().catch(() => undefined))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

function isRemoteImage(url) {
  return url.pathname.startsWith('/storage/v1/') || url.hostname === 'images.unsplash.com'
}

function isFont(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
}

async function cacheFirst(request, name, max) {
  const cache = await caches.open(name)
  const hit = await cache.match(request.url)
  if (hit) return hit
  const response = await fetch(request.url, { mode: 'cors' })
  if (response.ok) {
    await cache.put(request.url, response.clone())
    if (max) void trim(name, max)
  }
  return response
}

async function staleWhileRevalidate(request, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(request.url)
  const network = fetch(request.url, { mode: 'cors' })
    .then((response) => {
      if (response.ok) cache.put(request.url, response.clone())
      return response
    })
    .catch(() => undefined)
  const response = hit || (await network)
  if (!response) throw new Error('unavailable')
  return response
}

async function pageRequest(request) {
  const cache = await caches.open(CACHE)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok && new URL(request.url).pathname === '/') cache.put('/', response.clone())
    return response
  } catch {
    return (await cache.match('/')) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    if (isRemoteImage(url)) event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES).catch(() => fetch(request)).catch(() => Response.error()))
    else if (isFont(url)) event.respondWith(staleWhileRevalidate(request, FONTS).catch(() => fetch(request)).catch(() => Response.error()))
    return
  }
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(pageRequest(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || /\.(?:png|jpe?g|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request)),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Imperial Home', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Imperial Home'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/apple-touch-icon.png',
    data: { link: data.link || '/' },
    tag: data.tag || 'imperial-home',
  }
  event.waitUntil(
    self.registration.showNotification(title, options).catch(() => self.registration.showNotification(title, { body: options.body, data: options.data })),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  let link = (event.notification.data && event.notification.data.link) || '/'
  if (event.action === 'confirm' || event.action === 'decline') {
    link += (link.includes('?') ? '&' : '?') + 'do=' + event.action
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      return self.clients.openWindow(link)
    }),
  )
})
