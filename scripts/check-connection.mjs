import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

if (!url || !anon) {
  console.error('MISSING_ENV: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
}

async function probe(name, requestUrl) {
  try {
    const res = await fetch(requestUrl, { headers })
    const body = await res.text()
    if (!res.ok) {
      console.log(`${name}: HTTP ${res.status} — ${body.slice(0, 180)}`)
      return false
    }
    console.log(`${name}: OK`)
    return true
  } catch (err) {
    console.log(`${name}: ERROR — ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

console.log(`Project: ${url}`)
await probe('auth', `${url}/auth/v1/health`)
await probe('properties', `${url}/rest/v1/properties?select=id&limit=1`)
await probe('profiles', `${url}/rest/v1/profiles?select=id&limit=1`)
await probe('system_config', `${url}/rest/v1/system_config?select=key&limit=1`)
