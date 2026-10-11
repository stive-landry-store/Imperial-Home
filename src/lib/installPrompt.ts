export type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallEvent
    window.dispatchEvent(new Event('ih-install-available'))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    window.dispatchEvent(new Event('ih-install-available'))
  })
}

export function installEvent() {
  return deferred
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export type DevicePlatform = 'ios' | 'android' | 'desktop'

export function devicePlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  if (isIos()) return 'ios'
  if (/android/i.test(navigator.userAgent)) return 'android'
  return 'desktop'
}
