import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { CalendarSync, Percent, Sun, Trash2 } from 'lucide-react'
import { fetchPublishedProperties } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { formatXaf } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select } from '../../components/ui/Field'
import type { ExternalCalendar, Property, SeasonalRate } from '../../types/database'

// Imperial Home — seasons, weekend and long-stay pricing, and imported calendars.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

type PricingRow = Property & {
  weekend_percent?: number | null
  weekly_discount_percent?: number | null
  monthly_discount_percent?: number | null
}

async function fetchSeasons(): Promise<SeasonalRate[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('seasonal_rates').select('*').order('starts_on')
  if (error) throw error
  return (data ?? []) as SeasonalRate[]
}

async function fetchCalendars(): Promise<ExternalCalendar[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('external_calendars').select('*').order('created_at')
  if (error) throw error
  return (data ?? []) as ExternalCalendar[]
}

function PropertyRule({ property }: { property: PricingRow }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [weekend, setWeekend] = useState(property.weekend_percent ?? 0)
  const [weekly, setWeekly] = useState(property.weekly_discount_percent ?? 0)
  const [monthly, setMonthly] = useState(property.monthly_discount_percent ?? 0)
  const save = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase required')
      const { error } = await supabase
        .from('properties')
        .update({ weekend_percent: weekend, weekly_discount_percent: weekly, monthly_discount_percent: monthly })
        .eq('id', property.id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['properties'] }),
  })
  return (
    <div className="theme-card grid gap-3 rounded-2xl p-4 md:grid-cols-[1.2fr_repeat(3,1fr)_auto] md:items-end">
      <div>
        <p className="font-semibold">{property.name}</p>
        <p className="text-sm theme-muted">{formatXaf(property.nightly_rate_xaf)}{t('properties.perNight')}</p>
      </div>
      <div>
        <Label>{t('pricing.weekend')}</Label>
        <Input type="number" min={-50} max={200} value={weekend} onChange={(e) => setWeekend(Number(e.target.value))} />
      </div>
      <div>
        <Label>{t('pricing.weekly')}</Label>
        <Input type="number" min={0} max={90} value={weekly} onChange={(e) => setWeekly(Number(e.target.value))} />
      </div>
      <div>
        <Label>{t('pricing.monthly')}</Label>
        <Input type="number" min={0} max={90} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isSuccess ? t('pricing.saved') : t('pricing.save')}
      </Button>
    </div>
  )
}

export function AdminPricingPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const { data: properties = [] } = useQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties })
  const seasons = useQuery({ queryKey: ['seasonal-rates'], queryFn: fetchSeasons })
  const calendars = useQuery({ queryKey: ['external-calendars'], queryFn: fetchCalendars })

  const [label, setLabel] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [rate, setRate] = useState('')
  const [adjust, setAdjust] = useState(0)

  const [calProperty, setCalProperty] = useState('')
  const [calSource, setCalSource] = useState('airbnb')
  const [calUrl, setCalUrl] = useState('')

  const addSeason = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase required')
      const { error } = await supabase.from('seasonal_rates').insert({
        label,
        property_id: propertyId || null,
        starts_on: startsOn,
        ends_on: endsOn,
        nightly_rate_xaf: rate ? Number(rate) : null,
        adjust_percent: adjust,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setLabel('')
      setRate('')
      setAdjust(0)
      void client.invalidateQueries({ queryKey: ['seasonal-rates'] })
    },
  })

  const removeSeason = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase required')
      const { error } = await supabase.from('seasonal_rates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['seasonal-rates'] }),
  })

  const addCalendar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase required')
      const { error } = await supabase.from('external_calendars').insert({ property_id: calProperty, source: calSource, url: calUrl.trim() })
      if (error) throw error
    },
    onSuccess: () => {
      setCalUrl('')
      void client.invalidateQueries({ queryKey: ['external-calendars'] })
    },
  })

  const removeCalendar = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase required')
      const { error } = await supabase.from('external_calendars').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['external-calendars'] }),
  })

  const nameOf = (id: string | null) => (id ? properties.find((p) => p.id === id)?.name ?? '—' : t('pricing.allApartments'))
  const exportUrl = (p: Property) =>
    p.ical_token ? `${window.location.origin}/api/ical?token=${encodeURIComponent(p.ical_token)}` : null

  function submitSeason(event: FormEvent) {
    event.preventDefault()
    if (startsOn && endsOn) addSeason.mutate()
  }
  function submitCalendar(event: FormEvent) {
    event.preventDefault()
    if (calProperty && calUrl.startsWith('https://')) addCalendar.mutate()
  }

  return (
    <div className="space-y-10 px-4 py-5 md:p-10">
      <Helmet>
        <title>{`${t('pricing.title')} | Imperial Home`}</title>
      </Helmet>
      <header className="space-y-1">
        <h1 className="font-display text-3xl">{t('pricing.title')}</h1>
        <p className="theme-muted">{t('pricing.lead')}</p>
      </header>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Percent className="h-5 w-5 text-accent" /> {t('pricing.rulesTitle')}
        </h2>
        <p className="text-sm theme-muted">{t('pricing.rulesLead')}</p>
        <div className="space-y-3">
          {(properties as PricingRow[]).map((p) => (
            <PropertyRule key={`${p.id}-${p.weekend_percent ?? 0}-${p.weekly_discount_percent ?? 0}-${p.monthly_discount_percent ?? 0}`} property={p} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Sun className="h-5 w-5 text-accent" /> {t('pricing.seasonsTitle')}
        </h2>
        <p className="text-sm theme-muted">{t('pricing.seasonsLead')}</p>
        <form onSubmit={submitSeason} className="theme-card grid gap-3 rounded-2xl p-4 md:grid-cols-3">
          <div>
            <Label>{t('pricing.label')}</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('pricing.labelHint')} />
          </div>
          <div>
            <Label>{t('pricing.apartment')}</Label>
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">{t('pricing.allApartments')}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t('pricing.from')}</Label>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
            </div>
            <div>
              <Label>{t('pricing.to')}</Label>
              <Input type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>{t('pricing.fixedRate')}</Label>
            <Input type="number" min={1} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="—" />
          </div>
          <div>
            <Label>{t('pricing.adjust')}</Label>
            <Input type="number" min={-90} max={300} value={adjust} onChange={(e) => setAdjust(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={addSeason.isPending}>
              {t('pricing.addSeason')}
            </Button>
          </div>
        </form>
        <ul className="space-y-2">
          {(seasons.data ?? []).map((s) => (
            <li key={s.id} className="theme-card flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div>
                <p className="font-semibold">{s.label || t('pricing.season')}</p>
                <p className="text-sm theme-muted">
                  {nameOf(s.property_id)} · {s.starts_on} → {s.ends_on} ·{' '}
                  {s.nightly_rate_xaf ? formatXaf(s.nightly_rate_xaf) : ''}
                  {s.adjust_percent ? ` ${s.adjust_percent > 0 ? '+' : ''}${s.adjust_percent} %` : ''}
                </p>
              </div>
              <button type="button" aria-label={t('pricing.remove')} className="ih-btn rounded-full p-2 text-red-400" onClick={() => removeSeason.mutate(s.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <CalendarSync className="h-5 w-5 text-accent" /> {t('ical.title')}
        </h2>
        <p className="text-sm theme-muted">{t('ical.lead')}</p>
        <div className="space-y-2">
          {properties.map((p) => {
            const url = exportUrl(p)
            return url ? (
              <div key={p.id} className="theme-card rounded-2xl px-4 py-3 text-sm">
                <p className="font-semibold">{p.name} — {t('ical.export')}</p>
                <code className="mt-1 block break-all text-xs text-accent">{url}</code>
              </div>
            ) : null
          })}
        </div>
        <form onSubmit={submitCalendar} className="theme-card grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_0.7fr_2fr_auto] md:items-end">
          <div>
            <Label>{t('pricing.apartment')}</Label>
            <Select value={calProperty} onChange={(e) => setCalProperty(e.target.value)} required>
              <option value="">—</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('ical.source')}</Label>
            <Select value={calSource} onChange={(e) => setCalSource(e.target.value)}>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking.com</option>
              <option value="vrbo">Vrbo</option>
              <option value="google">Google</option>
              <option value="other">{t('ical.other')}</option>
            </Select>
          </div>
          <div>
            <Label>{t('ical.url')}</Label>
            <Input type="url" value={calUrl} onChange={(e) => setCalUrl(e.target.value)} placeholder="https://…/calendar.ics" required />
          </div>
          <Button type="submit" disabled={addCalendar.isPending}>
            {t('ical.add')}
          </Button>
        </form>
        <ul className="space-y-2">
          {(calendars.data ?? []).map((c) => (
            <li key={c.id} className="theme-card flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {nameOf(c.property_id)} · {c.source}
                </p>
                <p className="truncate text-xs theme-muted">{c.url}</p>
                <p className={`text-xs ${c.last_error ? 'text-red-400' : 'text-accent'}`}>
                  {c.last_error
                    ? c.last_error
                    : c.last_synced_at
                      ? t('ical.synced', { date: new Date(c.last_synced_at).toLocaleString() })
                      : t('ical.pending')}
                </p>
              </div>
              <button type="button" aria-label={t('pricing.remove')} className="ih-btn rounded-full p-2 text-red-400" onClick={() => removeCalendar.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
