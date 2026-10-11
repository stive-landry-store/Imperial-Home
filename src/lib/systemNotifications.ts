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

function sameKey(subscription: PushSubscription, key: string) {
  const current = subscription.options?.applicationServerKey
  if (!current) return true
  const wanted = urlBase64ToUint8Array(key)
  const have = new Uint8Array(current)
  return have.length === wanted.length && have.every((byte, index) => byte === wanted[index])
}

export async function registerPush(registration?: ServiceWorkerRegistration) {
  if (!supabase || !pushSupported() || Notification.permission !== 'granted') return false
  try {
    const key = await vapidKey()
    if (!key) return false
    const reg = registration ?? (await navigator.serviceWorker.ready)
    let subscription = await reg.pushManager.getSubscription()
    if (subscription && !sameKey(subscription, key)) {
      await subscription.unsubscribe()
      subscription = null
    }
    subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
    const { error } = await supabase.rpc('register_push', { p_endpoint: subscription.endpoint, p_subscription: subscription.toJSON() })
    if (error) return false
    localStorage.setItem(ACTIVE, '1')
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
  return true
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
