export type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null

const INSTALLED_KEY = 'ih-app-installed'

function markInstalled() {
  try {
    localStorage.setItem(INSTALLED_KEY, '1')
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallEvent
    window.dispatchEvent(new Event('ih-install-available'))
  })
  window.addEventListener('appinstalled', () => {
    markInstalled()
    deferred = null
    window.dispatchEvent(new Event('ih-install-available'))
  })
}

if (typeof window !== 'undefined') isAppInstalled()

export function installEvent() {
  return deferred
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** True when the app runs from the home screen, or when it was installed earlier on this device. */
export function isAppInstalled() {
  if (isStandalone()) {
    markInstalled()
    return true
  }
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
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
