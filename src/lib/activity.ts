import { supabase } from './supabase'

const SID_KEY = 'ih.act.sid'
const STARTED_KEY = 'ih.act.started'

function sessionId() {
  try {
    let sid = sessionStorage.getItem(SID_KEY)
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem(SID_KEY, sid)
    }
    return sid
  } catch {
    return 'na'
  }
}

export function activityDevice() {
  const ua = navigator.userAgent
  const os = /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Autre'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Navigateur'
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return `${os} · ${browser}${standalone ? ' · App' : ''}`
}

export function markSessionStarted() {
  try {
    sessionStorage.setItem(STARTED_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function isSessionStarted() {
  try {
    return sessionStorage.getItem(STARTED_KEY) === '1'
  } catch {
    return true
  }
}

export function clearSessionStarted() {
  try {
    sessionStorage.removeItem(STARTED_KEY)
    sessionStorage.removeItem(SID_KEY)
  } catch {
    /* private mode */
  }
}

export async function logActivity(kind: 'login' | 'logout' | 'open' | 'page', path?: string, details?: Record<string, unknown>) {
  if (!supabase) return
  try {
    await supabase.rpc('log_activity', {
      p_kind: kind,
      p_path: path ?? window.location.pathname,
      p_details: details ?? {},
      p_session: sessionId(),
      p_device: activityDevice(),
    })
  } catch {
    /* logging must never get in the way */
  }
}
