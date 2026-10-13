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

export async function enableNotifications() {
  if (!notificationsSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  localStorage.removeItem(OFF)
  localStorage.setItem(FLAG, '1')
  await registerPush()
  const french = document.documentElement.lang.startsWith('fr')
  await showLockScreenNotice(
    'Imperial Home',
    french
      ? 'Les messages arriveront sur cet écran, même si l’application est fermée.'
      : 'Messages will arrive on this screen, even when the app is closed.',
  )
  return true
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

export async function showLockScreenNotice(title: string, body: string, link = '/') {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/apple-touch-icon.png',
    data: { link },
    tag: 'imperial-home',
  })
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
}

export async function notify(title: string, body: string, link = '/') {
  if (!notificationsEnabled() || !document.hidden || localStorage.getItem(ACTIVE) === '1') return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { link },
    tag: `${title}|${link}`,
  })
}
