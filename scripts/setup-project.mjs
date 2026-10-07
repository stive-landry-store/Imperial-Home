/**
 * One-shot health check + auto-fix for Imperial Home (local .env required).
 * Run: npm run setup
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const path = resolve(process.cwd(), '.env')
  const text = readFileSync(path, 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
const service = env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = env.VITE_APP_URL || 'http://localhost:5173'

let exitCode = 0
function ok(msg) {
  console.log(`✓ ${msg}`)
}
function warn(msg) {
  console.log(`⚠ ${msg}`)
  exitCode = Math.max(exitCode, 1)
}
function fail(msg) {
  console.log(`✗ ${msg}`)
  exitCode = 2
}

console.log('\n=== Imperial Home — setup ===\n')

if (!url || !anon) {
  fail('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(2)
}
ok(`Supabase URL: ${url}`)

const pub = createClient(url, anon)
const admin = service ? createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }) : null

async function tableCount(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

// --- tables ---
for (const table of ['properties', 'profiles', 'system_config', 'reservations', 'admin_profiles']) {
  try {
    const n = await tableCount(pub, table)
    ok(`Table "${table}": ${n} row(s)`)
  } catch (e) {
    fail(`Table "${table}": ${e.message}`)
  }
}

// --- bootstrap admin emails in system_config ---
if (admin) {
  const bootstrapEmails = ['imperialhome237@gmail.com', 'stivelandry16@gmail.com']
  const { error: cfgErr } = await admin.from('system_config').upsert(
    {
      key: 'bootstrap_admin_emails',
      value: bootstrapEmails,
    },
    { onConflict: 'key' },
  )
  if (cfgErr) warn(`Could not upsert bootstrap_admin_emails: ${cfgErr.message}`)
  else ok('Bootstrap admin emails configured')

  for (const email of bootstrapEmails) {
    const { data: profile } = await admin.from('profiles').select('id, email, role').eq('email', email).maybeSingle()
    if (!profile) {
      warn(`No account yet for ${email} — register once on /register`)
      continue
    }
    if (profile.role === 'customer') {
      const { error: rpcErr } = await admin.rpc('grant_bootstrap_admin', { p_user_id: profile.id })
      if (rpcErr) warn(`Could not grant admin to ${email}: ${rpcErr.message}`)
      else ok(`Admin role granted to ${email}`)
    } else {
      ok(`${email} already has role: ${profile.role}`)
    }
  }
} else {
  warn('SUPABASE_SERVICE_ROLE_KEY missing — skipping admin auto-fix')
}

// --- password reset redirect test ---
const redirectTo = `${appUrl.replace(/\/$/, '')}/reset-password`
try {
  const res = await fetch(`${url}/auth/v1/recover`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'healthcheck@imperialhome.local', redirect_to: redirectTo }),
  })
  const body = await res.text()
  if (res.status === 200) {
    ok(`Password reset API accepts redirect: ${redirectTo}`)
  } else if (body.toLowerCase().includes('redirect') || body.toLowerCase().includes('url')) {
    fail(`Password reset blocked — add this URL in Supabase → Authentication → URL Configuration:\n    ${redirectTo}`)
    fail(`Also add: http://localhost:5174/reset-password`)
  } else if (res.status === 429) {
    warn('Password reset rate-limited — wait a few minutes')
  } else {
    ok(`Password reset API reachable (HTTP ${res.status})`)
  }
} catch (e) {
  warn(`Password reset test failed: ${e.message}`)
}

console.log('\n=== Done ===')
console.log(`\nOpen your site: ${appUrl}`)
console.log('Start dev server: npm run dev\n')
process.exit(exitCode)
