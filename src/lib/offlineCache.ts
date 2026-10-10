import type { Query, QueryClient } from '@tanstack/react-query'

const STORE = 'ih-offline-cache-v1'
const OWNER = 'ih-offline-owner'
const MAX_ENTRY = 400_000

const PUBLIC_ROOTS = new Set(['properties', 'property', 'site-config', 'vehicles', 'vehicle', 'promotions', 'property-index', 'reviews', 'vehicle-promos'])
const PRIVATE_ROOTS = new Set(['my-reservations', 'reservation', 'my-car-rentals', 'notifications'])

type Entry = { key: unknown[]; data: unknown; at: number; owner: boolean }

function root(key: readonly unknown[]) {
  return String(key[0])
}

function read(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}') as Record<string, Entry>
  } catch {
    return {}
  }
}

function write(entries: Record<string, Entry>) {
  try {
    localStorage.setItem(STORE, JSON.stringify(entries))
  } catch {
    const keep = Object.entries(entries)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, 12)
    try {
      localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(keep)))
    } catch {
      /* storage full */
    }
  }
}

export function hydrateOfflineCache(client: QueryClient, userId: string | null) {
  const owner = localStorage.getItem(OWNER)
  const entries = read()
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.owner && (!userId || owner !== userId)) {
      delete entries[id]
      continue
    }
    if (!client.getQueryData(entry.key as unknown[])) {
      client.setQueryData(entry.key as unknown[], entry.data, { updatedAt: entry.at })
    }
  }
  write(entries)
}

export function forgetPrivateOfflineData() {
  const entries = read()
  for (const [id, entry] of Object.entries(entries)) if (entry.owner) delete entries[id]
  write(entries)
  localStorage.removeItem(OWNER)
}

export function startOfflinePersistence(client: QueryClient, userId: string | null) {
  if (userId) localStorage.setItem(OWNER, userId)
  let timer: number | undefined
  const pending = new Map<string, Query>()

  const flush = () => {
    const entries = read()
    for (const [id, query] of pending) {
      const data = query.state.data
      if (data === undefined) continue
      const json = JSON.stringify(data)
      if (json.length > MAX_ENTRY) continue
      entries[id] = { key: [...query.queryKey], data, at: Date.now(), owner: PRIVATE_ROOTS.has(root(query.queryKey)) }
    }
    pending.clear()
    write(entries)
  }

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return
    const key = event.query.queryKey
    const r = root(key)
    if (!PUBLIC_ROOTS.has(r) && !(userId && PRIVATE_ROOTS.has(r))) return
    pending.set(event.query.queryHash, event.query)
    window.clearTimeout(timer)
    timer = window.setTimeout(flush, 1500)
  })
  return () => {
    window.clearTimeout(timer)
    unsubscribe()
  }
}
