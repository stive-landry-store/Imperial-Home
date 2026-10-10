import { supabase } from './supabase'

const FLAG = 'ih-system-notifications'

export function notificationsSupported() {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator
}

export function notificationsEnabled() {
  return notificationsSupported() && Notification.permission === 'granted' && localStorage.getItem(FLAG) === '1'
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key || !supabase || !('PushManager' in window)) return
  try {
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }))
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    await supabase.from('push_subscriptions').upsert({ user_id: data.user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON() })
  } catch {
    /* push is optional */
  }
}

export async function enableNotifications() {
  if (!notificationsSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  localStorage.setItem(FLAG, '1')
  const registration = await navigator.serviceWorker.ready
  void subscribeToPush(registration)
  return true
}

export function disableNotifications() {
  localStorage.removeItem(FLAG)
}

export async function notify(title: string, body: string, link = '/') {
  if (!notificationsEnabled() || !document.hidden) return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { link },
    tag: `${title}:${body}`.slice(0, 60),
  })
}
