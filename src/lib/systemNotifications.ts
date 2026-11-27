import { supabase } from './supabase'

const FLAG = 'ih-system-notifications'
const OFF = 'ih-system-notifications-off'
const ACTIVE = 'ih-push-active'

export function notificationsSupported() {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator
}

export function pushSupported() {
  return notificationsSupported() && 'PushManager' in window
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone only shows lock-screen notifications for an app opened from the Home Screen icon. */
export function needsHomeScreenInstall() {
  return isIosDevice() && !isInstalledApp()
}

export function notificationsEnabled() {
  return notificationsSupported() && Notification.permission === 'granted' && localStorage.getItem(FLAG) === '1'
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

let badgeHoldUntil = 0

export function holdAppBadge(ms = 60_000) {
  badgeHoldUntil = Date.now() + ms
  window.dispatchEvent(new Event('ih-badge-hold'))
}

export function badgeHoldActive() {
  return Date.now() < badgeHoldUntil
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

const STORED_BADGE = 'ih-icon-badge'

export function storedBadge() {
  const count = Number(localStorage.getItem(STORED_BADGE) || 0)
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0
}

export async function paintBadge(count: number) {
  const total = Math.max(0, Math.round(count))
  try {
    localStorage.setItem(STORED_BADGE, String(total))
  } catch {
    /* ignore private mode */
  }
  const nav = navigator as BadgeNavigator
  try {
    if (total > 0) await nav.setAppBadge?.(total)
    else await nav.clearAppBadge?.()
  } catch {
    /* this phone does not show a number on the icon */
  }
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'badge', count: total })
  } catch {
    /* the icon is updated from the page */
  }
}

function sameServerKey(subscription: PushSubscription, key: string) {
  const current = subscription.options?.applicationServerKey
  if (!current) return true
  const bytes = new Uint8Array(current)
  const next = urlBase64ToUint8Array(key)
  if (bytes.length !== next.length) return false
  for (let index = 0; index < bytes.length; index += 1) if (bytes[index] !== next[index]) return false
  return true
}

async function vapidKey() {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (fromEnv) return fromEnv
  try {
    const response = await fetch('/api/push', { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { publicKey?: string }
    return data.publicKey ?? null
  } catch {
    return null
  }
}

export async function registerPush(registration?: ServiceWorkerRegistration) {
  if (!supabase || !pushSupported() || Notification.permission !== 'granted') return false
  try {
    const key = await vapidKey()
    if (!key) return false
    const reg = registration ?? (await navigator.serviceWorker.ready)
    let subscription = await reg.pushManager.getSubscription()
    if (subscription && !sameServerKey(subscription, key)) {
      await subscription.unsubscribe()
      subscription = null
    }
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
    }
    const { error } = await supabase.rpc('register_push', { p_endpoint: subscription.endpoint, p_subscription: subscription.toJSON() })
    if (error) return false
    localStorage.setItem(ACTIVE, '1')
    void deliverQueuedPushes()
    return true
  } catch {
    return false
  }
}

/** Called after sign-in: when the user already allowed notifications on this device, make sure pushes reach it. */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted' || localStorage.getItem(OFF) === '1') return
  localStorage.setItem(FLAG, '1')
  await registerPush()
}

export type NoticeState = 'on' | 'blocked' | 'unlinked'

export async function enableNotifications(): Promise<NoticeState> {
  if (!notificationsSupported()) return 'blocked'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'blocked'
  localStorage.removeItem(OFF)
  localStorage.setItem(FLAG, '1')
  const saved = await registerPush()
  const french = document.documentElement.lang.startsWith('fr')
  const shown = await showLockScreenNotice(
    'Imperial Home',
    french
      ? 'Les messages arriveront sur cet écran, même si l’application est fermée.'
      : 'Messages will arrive on this screen, even when the app is closed.',
  )
  if (!shown) return 'blocked'
  return saved ? 'on' : 'unlinked'
}

async function postPush(id: string) {
  const response = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) return 0
  const data = (await response.json()) as { sent?: number }
  return data.sent ?? 0
}

/** Ask the server to deliver one queued alert to this phone. */
export async function deliverPush(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return 0
  return postPush(id)
}

/** Sends anything the phone has not received yet, including a first test the next time the app opens. */
export async function deliverQueuedPushes() {
  if (!supabase || Notification.permission !== 'granted') return
  const pending = await supabase.rpc('pending_pushes')
  const ids = Array.isArray(pending.data) ? (pending.data as string[]) : []
  for (const id of ids) await postPush(id)
  if (localStorage.getItem('ih-push-proved') === '1') return
  const ping = await supabase.rpc('push_ping')
  if (ping.error || typeof ping.data !== 'string') return
  const sent = await postPush(ping.data)
  if (sent > 0) localStorage.setItem('ih-push-proved', '1')
}

async function readyRegistration() {
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      window.setTimeout(() => reject(new Error('sw')), 8000)
    }),
  ])
}

export async function showLockScreenNotice(title: string, body: string, link = '/') {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  let registration: ServiceWorkerRegistration
  try {
    registration = await readyRegistration()
  } catch {
    return false
  }
  const tag = link || `ih-${Date.now()}`
  const payload = { type: 'notice', title, body, link, tag }
  try {
    await registration.showNotification(title, { body, icon: '/icon-192.png', data: { link }, tag })
  } catch {
    try {
      await registration.showNotification(title, { body, data: { link }, tag })
    } catch {
      if (!registration.active) return false
      registration.active.postMessage(payload)
    }
  }
  holdAppBadge()
  await paintBadge(1)
  return true
}

/** Puts one alert on the phone screen and a number on the home-screen icon. */
export async function previewOnScreen() {
  const saved = Notification.permission === 'granted' ? await registerPush() : false
  const french = document.documentElement.lang.startsWith('fr')
  const shown = await showLockScreenNotice(
    'Imperial Home',
    french
      ? 'Essai : cette alerte doit apparaître sur l’écran du téléphone.'
      : 'Test: this alert should appear on your phone screen.',
  )
  void deliverQueuedPushes()
  return { shown, saved }
}

export async function forgetPushOnThisDevice() {
  localStorage.removeItem(ACTIVE)
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (subscription && supabase) await supabase.rpc('unregister_push', { p_endpoint: subscription.endpoint })
  } catch {
    /* ignore */
  }
}

export async function disableNotifications() {
  localStorage.removeItem(FLAG)
  localStorage.setItem(OFF, '1')
  await forgetPushOnThisDevice()
  await paintBadge(0)
}

export async function notify(title: string, body: string, link = '/') {
  if (!notificationsEnabled()) return
  await showLockScreenNotice(title, body, link)
}
