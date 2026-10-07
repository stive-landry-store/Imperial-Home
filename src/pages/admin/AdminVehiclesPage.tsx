import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, Textarea } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'
import {
  addVehicleImageUrl,
  deleteVehicleMedia,
  fetchAllVehicles,
  uploadVehicleMedia,
  vehicleCover,
  type Vehicle,
} from '../../lib/vehicles'
import { formatXaf } from '../../lib/format'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminVehiclesPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: vehicles = [] } = useQuery({ queryKey: ['admin-vehicles'], queryFn: fetchAllVehicles })
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [form, setForm] = useState({
    brand: '',
    model: '',
    slug: '',
    description_fr: '',
    description_en: '',
    daily_rate_no_driver_xaf: 50_000,
    daily_rate_with_driver_xaf: 60_000,
    status: 'published' as Vehicle['status'],
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase required')
      const payload = {
        brand: form.brand,
        model: form.model,
        slug: form.slug || slugify(`${form.brand}-${form.model}`),
        description_fr: form.description_fr,
        description_en: form.description_en,
        daily_rate_no_driver_xaf: Number(form.daily_rate_no_driver_xaf),
        daily_rate_with_driver_xaf: Number(form.daily_rate_with_driver_xaf),
        status: form.status,
      }
      if (editing) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editing.id)
        if (error) throw error
        return editing.id
      }
      const { data, error } = await supabase.from('vehicles').insert(payload).select('id').single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: async (vehicleId) => {
      void client.invalidateQueries({ queryKey: ['admin-vehicles'] })
      void client.invalidateQueries({ queryKey: ['vehicles'] })
      const refreshed = await fetchAllVehicles()
      const row = refreshed.find((v) => v.id === vehicleId)
      if (row) setEditing(row)
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase required')
      const { error } = await supabase.from('vehicles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-vehicles'] })
      if (editing) setEditing(null)
    },
  })

  function startNew() {
    setEditing(null)
    setPhotoUrl('')
    setForm({
      brand: 'Toyota',
      model: '',
      slug: '',
      description_fr: '',
      description_en: '',
      daily_rate_no_driver_xaf: 50_000,
      daily_rate_with_driver_xaf: 60_000,
      status: 'published',
    })
  }

  function startEdit(v: Vehicle) {
    setEditing(v)
    setPhotoUrl('')
    setForm({
      brand: v.brand,
      model: v.model,
      slug: v.slug,
      description_fr: v.description_fr,
      description_en: v.description_en,
      daily_rate_no_driver_xaf: v.daily_rate_no_driver_xaf,
      daily_rate_with_driver_xaf: v.daily_rate_with_driver_xaf,
      status: v.status,
    })
  }

  async function onUploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !editing) return
    setMediaError(null)
    try {
      for (const file of [...fileList]) {
        await uploadVehicleMedia(file, editing.id)
      }
      void client.invalidateQueries({ queryKey: ['admin-vehicles'] })
      void client.invalidateQueries({ queryKey: ['vehicles'] })
      const refreshed = await fetchAllVehicles()
      const row = refreshed.find((v) => v.id === editing.id)
      if (row) setEditing(row)
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : t('admin.vehiclePhotoError'))
    }
  }

  async function onAddUrl() {
    if (!editing || !photoUrl.trim()) return
    setMediaError(null)
    try {
      await addVehicleImageUrl(editing.id, photoUrl)
      setPhotoUrl('')
      void client.invalidateQueries({ queryKey: ['admin-vehicles'] })
      const refreshed = await fetchAllVehicles()
      const row = refreshed.find((v) => v.id === editing.id)
      if (row) setEditing(row)
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : t('admin.vehiclePhotoError'))
    }
  }

  async function onRemoveMedia(mediaId: string) {
    if (!editing) return
    await deleteVehicleMedia(mediaId)
    void client.invalidateQueries({ queryKey: ['admin-vehicles'] })
    const refreshed = await fetchAllVehicles()
    const row = refreshed.find((v) => v.id === editing.id)
    if (row) setEditing(row)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  const editingMedia = [...(editing?.vehicle_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.vehicles')} | Impérial Home</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">{t('admin.vehicles')}</h1>
        <Button type="button" onClick={startNew}>
          {t('admin.vehicleAdd')}
        </Button>
      </div>

      <form className="surface-light mt-8 grid max-w-2xl gap-4 border border-line p-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t('admin.vehicleBrand')}</Label>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
          </div>
          <div>
            <Label>{t('admin.vehicleModel')}</Label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t('admin.vehicleRateNoDriver')}</Label>
            <Input
              type="number"
              value={form.daily_rate_no_driver_xaf}
              onChange={(e) => setForm({ ...form, daily_rate_no_driver_xaf: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>{t('admin.vehicleRateDriver')}</Label>
            <Input
              type="number"
              value={form.daily_rate_with_driver_xaf}
              onChange={(e) => setForm({ ...form, daily_rate_with_driver_xaf: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <Label>{t('admin.vehicleDescFr')}</Label>
          <Textarea rows={3} value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} />
        </div>
        <div>
          <Label>{t('admin.roomStatus')}</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle['status'] })}>
            <option value="published">{t('admin.statusPublished')}</option>
            <option value="draft">{t('admin.statusDraft')}</option>
            <option value="archived">{t('admin.statusArchived')}</option>
          </Select>
        </div>
        <Button type="submit" disabled={save.isPending}>
          {t('common.save')}
        </Button>
      </form>

      {editing ? (
        <div className="surface-light mt-8 max-w-2xl border border-line p-6">
          <h2 className="font-display text-2xl">
            {t('admin.vehiclePhotos')} — {editing.brand} {editing.model}
          </h2>
          <p className="mt-1 text-sm text-[var(--surface-muted)]">{t('admin.vehiclePhotosHint')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              {t('admin.vehicleUploadPhotos')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => void onUploadFiles(e.target.files)}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            <Button type="button" variant="ghost" onClick={() => void onAddUrl()}>
              {t('admin.vehicleAddPhotoUrl')}
            </Button>
          </div>
          {mediaError ? <p className="mt-2 text-sm text-red-600">{mediaError}</p> : null}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {editingMedia.map((m) => (
              <div key={m.id} className="relative overflow-hidden rounded border border-line">
                {m.media_type === 'video' ? (
                  <video src={m.url} className="aspect-video w-full object-cover" controls muted />
                ) : (
                  <img src={m.url} alt="" className="aspect-video w-full object-cover" />
                )}
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase text-white"
                  onClick={() => void onRemoveMedia(m.id)}
                >
                  {t('admin.vehiclePhotoRemove')}
                </button>
              </div>
            ))}
          </div>
          {editingMedia.length === 0 ? <p className="mt-4 text-sm text-muted">{t('admin.vehiclePhotosEmpty')}</p> : null}
        </div>
      ) : (
        <p className="mt-6 text-sm theme-muted">{t('admin.vehiclePhotosSaveFirst')}</p>
      )}

      <ul className="surface-light mt-10 divide-y divide-line border border-line">
        {vehicles.map((v) => {
          const cover = vehicleCover(v)
          return (
            <li key={v.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {cover ? (
                  <img src={cover} alt="" className="h-16 w-24 rounded border border-line object-cover" />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-line text-xs text-muted">
                    {t('admin.vehicleNoPhoto')}
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-sm text-muted">
                    {formatXaf(v.daily_rate_no_driver_xaf)} · {formatXaf(v.daily_rate_with_driver_xaf)} {t('cars.withDriver')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="text-xs uppercase tracking-wider text-gold" onClick={() => startEdit(v)}>
                  {t('admin.roomEditBtn')}
                </button>
                <button type="button" className="text-xs uppercase tracking-wider text-red-700" onClick={() => remove.mutate(v.id)}>
                  {t('admin.roomDelete')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
