import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Monitor, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Loader } from '../../components/ui/Loader'
import { Input } from '../../components/ui/Field'
import { cn } from '../../lib/cn'

const TZ = 'Africa/Douala'
const ONLINE_MS = 5 * 60 * 1000
const PAGE = 100

type Entry = {
  id: number
  user_id: string | null
  user_name: string | null
  user_email: string | null
  user_role: string | null
  kind: 'login' | 'logout' | 'open' | 'page' | 'action'
  entity: string | null
  op: string | null
  entity_id: string | null
  path: string | null
  details: Record<string, unknown> | null
  device: string | null
  created_at: string
}

type Person = {
  user_id: string
  user_name: string | null
  user_email: string | null
  user_role: string | null
  last_login: string | null
  last_seen: string | null
  logins: number
  events: number
}

type Kind = 'all' | 'connections' | 'pages' | 'actions'

function dayStartIso(day: string) {
  return new Date(`${day}T00:00:00+01:00`).toISOString()
}

function dayEndIso(day: string) {
  return new Date(new Date(`${day}T00:00:00+01:00`).getTime() + 24 * 3600 * 1000).toISOString()
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

function formatTime(iso: string | null, locale: string) {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function pageKey(path: string) {
  if (path === '/') return 'home'
  if (path === '/admin') return 'adminHome'
  if (path.startsWith('/admin')) return 'adminSection'
  if (/^\/properties\/[^/]+\/book/.test(path)) return 'book'
  if (path === '/properties' || path === '/properties/map') return 'properties'
  if (path.startsWith('/properties/')) return 'property'
  if (path.startsWith('/cars')) return 'cars'
  if (path.startsWith('/contact')) return 'contact'
  if (path.startsWith('/login')) return 'login'
  if (path.startsWith('/register')) return 'register'
  if (path.startsWith('/account/profile')) return 'profile'
  if (path.startsWith('/account/chat')) return 'chat'
  if (path.startsWith('/account')) return 'account'
  if (path.startsWith('/favoris')) return 'favorites'
  if (path.startsWith('/installer')) return 'install'
  return null
}

export function AdminActivityPage() {
  const { t, i18n } = useTranslation()
  const { profile, loading } = useAuth()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'fr-FR'
  const isSuper = profile?.role === 'super_admin'

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [day, setDay] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  const people = useQuery({
    queryKey: ['activity-people'],
    enabled: isSuper,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.rpc('activity_users')
      if (error) throw error
      return (data ?? []) as Person[]
    },
  })

  const today = useQuery({
    queryKey: ['activity-today'],
    enabled: isSuper,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('activity_log')
        .select('user_id, kind')
        .gte('created_at', dayStartIso(todayKey()))
        .limit(5000)
      if (error) throw error
      return (data ?? []) as { user_id: string | null; kind: string }[]
    },
  })

  const journal = useQuery({
    queryKey: ['activity-journal', { search, role, kind, day, userId, limit }],
    enabled: isSuper,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!supabase) return []
      let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
      if (userId) q = q.eq('user_id', userId)
      if (role) q = q.eq('user_role', role)
      if (kind === 'connections') q = q.in('kind', ['login', 'open', 'logout'])
      if (kind === 'pages') q = q.eq('kind', 'page')
      if (kind === 'actions') q = q.eq('kind', 'action')
      if (day) q = q.gte('created_at', dayStartIso(day)).lt('created_at', dayEndIso(day))
      const term = search.trim().replace(/[,()%]/g, ' ')
      if (term) q = q.or(`user_name.ilike.%${term}%,user_email.ilike.%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Entry[]
    },
  })

  const stats = useMemo(() => {
    const now = Date.now()
    const list = people.data ?? []
    const online = list.filter((p) => p.last_seen && now - new Date(p.last_seen).getTime() < ONLINE_MS)
    const rows = today.data ?? []
    return {
      online,
      loginsToday: rows.filter((r) => r.kind === 'login' || r.kind === 'open').length,
      activeToday: new Set(rows.map((r) => r.user_id).filter(Boolean)).size,
    }
  }, [people.data, today.data])

  if (loading) return <Loader size="lg" fill />
  if (!isSuper) return <Navigate to="/admin" replace />

  const roleLabel = (r: string | null) => (r ? t(`activity.role.${r}`, { defaultValue: r }) : '')
  const isOnline = (iso: string | null) => Boolean(iso && Date.now() - new Date(iso).getTime() < ONLINE_MS)
  const selected = userId ? (people.data ?? []).find((p) => p.user_id === userId) : null

  function describe(e: Entry) {
    if (e.kind === 'page') {
      const key = e.path ? pageKey(e.path) : null
      return (
        <>
          {t('activity.kind.page')} <strong>{key ? t(`activity.pages.${key}`) : e.path}</strong>
          {key && e.path && key !== 'home' ? <span className="text-muted"> · {e.path}</span> : null}
        </>
      )
    }
    if (e.kind === 'action') {
      const d = e.details ?? {}
      const bits: string[] = []
      if (d.status_to) bits.push(`${t('activity.statusChange')}: ${String(d.status_from ?? '')} → ${String(d.status_to)}`)
      if (d.role_to) bits.push(`${t('activity.roleChange')}: ${String(d.role_from ?? '')} → ${String(d.role_to)}`)
      if (!d.status_to && !d.role_to && Array.isArray(d.changed)) {
        bits.push(`${t('activity.changed')}: ${(d.changed as string[]).slice(0, 6).join(', ')}`)
      }
      return (
        <>
          {t(`activity.op.${e.op ?? 'update'}`, { defaultValue: e.op ?? '' })}{' '}
          <strong>{t(`activity.entity.${e.entity ?? ''}`, { defaultValue: e.entity ?? '' })}</strong>
          {bits.length ? <span className="text-muted"> · {bits.join(' · ')}</span> : null}
        </>
      )
    }
    return <strong>{t(`activity.kind.${e.kind}`)}</strong>
  }

  const kinds: { key: Kind; label: string }[] = [
    { key: 'all', label: t('activity.allKinds') },
    { key: 'connections', label: t('activity.kindConnections') },
    { key: 'pages', label: t('activity.kindPages') },
    { key: 'actions', label: t('activity.kindActions') },
  ]

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{`${t('activity.title')} | Imperial Home`}</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('activity.title')}</h1>
      <p className="mt-2 max-w-2xl text-base theme-muted">{t('activity.lead')}</p>

      <div className="mt-6 grid max-w-3xl grid-cols-3 gap-3">
        {[
          { label: t('activity.onlineNow'), value: stats.online.length },
          { label: t('activity.loginsToday'), value: stats.loginsToday },
          { label: t('activity.activeToday'), value: stats.activeToday },
        ].map((s) => (
          <div key={s.label} className="surface-light border border-line p-4">
            <p className="font-display text-3xl">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-[var(--surface-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">{t('activity.people')}</h2>
      <ul className="surface-light mt-3 max-h-[26rem] divide-y divide-line overflow-y-auto border border-line">
        {people.isLoading ? (
          <li className="px-4"><Loader size="sm" /></li>
        ) : (people.data ?? []).length === 0 ? (
          <li className="px-4 py-6 text-muted">{t('activity.empty')}</li>
        ) : (
          (people.data ?? []).map((p) => (
            <li key={p.user_id}>
              <button
                type="button"
                onClick={() => {
                  setUserId(p.user_id === userId ? null : p.user_id)
                  setLimit(PAGE)
                }}
                className={cn(
                  'flex w-full flex-col gap-1 px-4 py-3 text-left md:flex-row md:items-center md:justify-between',
                  p.user_id === userId && 'bg-[#c4a35a]/15',
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-full', isOnline(p.last_seen) ? 'bg-green-500' : 'bg-neutral-400')}
                      title={isOnline(p.last_seen) ? t('activity.online') : undefined}
                    />
                    <span className="truncate">{p.user_name || p.user_email || t('activity.unknown')}</span>
                    <span className="text-xs uppercase tracking-wider text-gold">{roleLabel(p.user_role)}</span>
                  </span>
                  <span className="block truncate text-sm text-muted">{p.user_email}</span>
                </span>
                <span className="text-sm text-muted md:text-right">
                  <span className="block">
                    {t('activity.lastLogin')} : {p.last_login ? formatTime(p.last_login, locale) : t('activity.never')}
                  </span>
                  <span className="block">
                    {t('activity.lastSeen')} : {formatTime(p.last_seen, locale)} · {p.logins} {t('activity.logins')} · {p.events}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      <h2 className="mt-10 font-display text-2xl">{t('activity.journal')}</h2>
      <div className="mt-3 grid max-w-3xl gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(PAGE)
            }}
            placeholder={t('activity.search')}
          />
        </div>
        <select
          className="surface-light min-h-11 border border-line px-3 text-base"
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setLimit(PAGE)
          }}
        >
          <option value="">{t('activity.allRoles')}</option>
          {['customer', 'admin', 'main_admin', 'super_admin'].map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label={t('activity.day')}
          className="surface-light min-h-11 border border-line px-3 text-base"
          value={day}
          onChange={(e) => {
            setDay(e.target.value)
            setLimit(PAGE)
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kinds.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => {
              setKind(k.key)
              setLimit(PAGE)
            }}
            className={cn(
              'min-h-10 border px-3 text-xs uppercase tracking-wider',
              kind === k.key ? 'border-[#c4a35a] bg-[#c4a35a] text-black' : 'border-line',
            )}
          >
            {k.label}
          </button>
        ))}
        {day ? (
          <button type="button" className="text-xs uppercase tracking-wider text-gold" onClick={() => setDay('')}>
            {t('activity.allDays')}
          </button>
        ) : null}
        {selected ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 border border-[#c4a35a] px-3 py-2 text-xs uppercase tracking-wider text-gold"
            onClick={() => setUserId(null)}
          >
            {selected.user_name || selected.user_email}
            <X size={14} />
          </button>
        ) : null}
      </div>

      <ul className="surface-light mt-4 divide-y divide-line border border-line">
        {journal.isLoading ? (
          <li className="px-4"><Loader size="sm" /></li>
        ) : (journal.data ?? []).length === 0 ? (
          <li className="px-4 py-6 text-muted">{t('activity.empty')}</li>
        ) : (
          (journal.data ?? []).map((e) => (
            <li key={e.id} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-base">
                  <span className="font-medium">{e.user_name || e.user_email || t('activity.unknown')}</span>{' '}
                  <span className="text-xs uppercase tracking-wider text-gold">{roleLabel(e.user_role)}</span>
                </p>
                <p className="text-base">{describe(e)}</p>
                {e.device ? (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                    <Monitor size={12} />
                    {e.device}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm tabular-nums text-muted">{formatTime(e.created_at, locale)}</p>
            </li>
          ))
        )}
      </ul>
      {(journal.data ?? []).length >= limit ? (
        <button
          type="button"
          className="mt-4 min-h-11 border border-line px-5 text-sm uppercase tracking-wider"
          onClick={() => setLimit((n) => n + PAGE)}
        >
          {t('activity.more')}
        </button>
      ) : null}
    </div>
  )
}
