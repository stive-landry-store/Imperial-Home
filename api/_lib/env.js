// Imperial Home — shared server helpers for Vercel functions.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import { createClient } from '@supabase/supabase-js'

export function siteOrigin(req) {
  const configured = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').replace(/\/$/, '')
  if (configured) return configured
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host
  return host ? `https://${host}` : 'https://imperial-home.vercel.app'
}

/** Public (anon) client — reads only what RLS lets visitors see. */
export function anonClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

/** Service-role client — server only, never sent to the browser. */
export function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

export function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}')
    } catch {
      return null
    }
  }
  return {}
}

export const escapeHtml = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
