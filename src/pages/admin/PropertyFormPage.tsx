import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, Textarea } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'
import { fetchPropertyById } from '../../lib/data'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateSiteData } from '../../lib/queryCache'
import { IMPERIAL_HOME } from '../../lib/house'
import {
  addPropertyImageUrl,
  deletePropertyImage,
  setPropertyCoverImage,
  slugifyRoomName,
  uploadAndAddPropertyImage,
} from '../../lib/propertyImages'
import type { PropertyImage, PropertyStatus } from '../../types/database'
import { Loader } from '../../components/ui/Loader'

type RoomForm = {

  slug: string

  name: string

  description_en: string

  description_fr: string

  address: string

  city: string

  neighborhood: string

  capacity: number

  bedrooms: number

  bathrooms: number

  living_areas: number

  nightly_rate_xaf: number

  cleaning_fee_xaf: number

  security_deposit_xaf: number

  weekly_discount_percent: number

  monthly_discount_percent: number

  guide_fr: string

  guide_en: string

  access_notes_fr: string

  access_notes_en: string

  rules_en: string

  rules_fr: string

  status: PropertyStatus

}



const empty: RoomForm = {

  slug: '',

  name: '',

  description_en: '',

  description_fr: '',

  address: IMPERIAL_HOME.address,

  city: IMPERIAL_HOME.city,

  neighborhood: IMPERIAL_HOME.neighborhood,

  capacity: 2,

  bedrooms: 1,

  bathrooms: 1,

  living_areas: 0,

  nightly_rate_xaf: 50_000,

  cleaning_fee_xaf: 0,

  security_deposit_xaf: 0,

  weekly_discount_percent: 0,

  monthly_discount_percent: 0,

  guide_fr: '',

  guide_en: '',

  access_notes_fr: '',

  access_notes_en: '',

  rules_en: '',

  rules_fr: '',

  status: 'published',

}



export function PropertyFormPage() {

  const { id } = useParams()

  const isNew = id === 'new' || !id

  const navigate = useNavigate()

  const client = useQueryClient()

  const { t } = useTranslation()

  const [form, setForm] = useState<RoomForm>(empty)

  const [slugManual, setSlugManual] = useState(false)

  const [images, setImages] = useState<PropertyImage[]>([])

  const [photoUrl, setPhotoUrl] = useState('')

  const [mediaError, setMediaError] = useState<string | null>(null)

  const [createPendingFiles, setCreatePendingFiles] = useState<File[]>([])

  const [error, setError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)



  useEffect(() => {

    if (isNew) return

    void fetchPropertyById(id!).then((p) => {

      if (!p) return

      setForm({

        slug: p.slug,

        name: p.name,

        description_en: p.description_en,

        description_fr: p.description_fr,

        address: p.address,

        city: p.city,

        neighborhood: p.neighborhood ?? IMPERIAL_HOME.neighborhood,

        capacity: p.capacity,

        bedrooms: p.bedrooms,

        bathrooms: p.bathrooms,

        living_areas: p.living_areas,

        nightly_rate_xaf: p.nightly_rate_xaf,

        cleaning_fee_xaf: p.cleaning_fee_xaf ?? 0,

        security_deposit_xaf: p.security_deposit_xaf ?? 0,

        weekly_discount_percent: p.weekly_discount_percent ?? 0,

        monthly_discount_percent: p.monthly_discount_percent ?? 0,

        guide_fr: p.guide_fr ?? '',

        guide_en: p.guide_en ?? '',

        access_notes_fr: p.access_notes_fr ?? '',

        access_notes_en: p.access_notes_en ?? '',

        rules_en: p.rules_en ?? '',

        rules_fr: p.rules_fr ?? '',

        status: p.status,

      })

      setSlugManual(true)

      setImages([...(p.property_images ?? [])].sort((a, b) => a.sort_order - b.sort_order))

    })

  }, [id, isNew])



  function setField<K extends keyof RoomForm>(key: K, value: RoomForm[K]) {

    setForm((prev) => {

      const next = { ...prev, [key]: value }

      if (key === 'name' && !slugManual) next.slug = slugifyRoomName(String(value))

      return next

    })

  }



  async function reloadImages(propertyId: string) {

    const p = await fetchPropertyById(propertyId)

    if (p?.property_images) {

      setImages([...p.property_images].sort((a, b) => a.sort_order - b.sort_order))

    }

  }



  async function onUploadFiles(fileList: FileList | null) {

    if (!fileList?.length) return

    setMediaError(null)

    const files = [...fileList]

    try {

      if (isNew) {

        setCreatePendingFiles((prev) => [...prev, ...files])

        return

      }

      if (!id) return

      for (const file of files) {

        await uploadAndAddPropertyImage(file, id, form.name)

      }

      await reloadImages(id)

      await invalidateSiteData(client, id, form.slug)

    } catch (err) {

      setMediaError(err instanceof Error ? err.message : t('admin.roomPhotoError'))

    }

  }



  async function onAddPhotoUrl() {

    if (!photoUrl.trim()) return

    setMediaError(null)

    try {

      if (isNew) {

        setMediaError(t('admin.roomPhotosSaveFirst'))

        return

      }

      if (!id) return

      await addPropertyImageUrl(id, photoUrl, form.name)

      setPhotoUrl('')

      await reloadImages(id)

      await invalidateSiteData(client, id, form.slug)

    } catch (err) {

      setMediaError(err instanceof Error ? err.message : t('admin.roomPhotoError'))

    }

  }



  async function onRemoveImage(imageId: string) {

    if (!id || isNew) return

    setMediaError(null)

    try {

      await deletePropertyImage(imageId)

      await reloadImages(id)

      await invalidateSiteData(client, id, form.slug)

    } catch (err) {

      setMediaError(err instanceof Error ? err.message : t('admin.roomPhotoError'))

    }

  }



  async function onSetCover(imageId: string) {

    if (!id || isNew) return

    setMediaError(null)

    try {

      await setPropertyCoverImage(id, imageId)

      await reloadImages(id)

      await invalidateSiteData(client, id, form.slug)

    } catch (err) {

      setMediaError(err instanceof Error ? err.message : t('admin.roomPhotoError'))

    }

  }



  async function onSubmit(e: FormEvent) {

    e.preventDefault()

    if (!supabase) {

      setError(t('admin.roomNeedSupabase'))

      return

    }

    setSaving(true)

    setError(null)

    try {

      const payload = {

        slug: form.slug || slugifyRoomName(form.name),

        name: form.name,

        description_en: form.description_en || `The ${form.name} apartment at Impérial Home.`,

        description_fr: form.description_fr || `L'appartement ${form.name} à Impérial Home.`,

        welcome_message_en: `Welcome to the ${form.name} apartment at Impérial Home.`,

        welcome_message_fr: `Bienvenue dans l'appartement ${form.name} à Impérial Home.`,

        address: form.address,

        city: form.city,

        neighborhood: form.neighborhood,

        country: IMPERIAL_HOME.country,

        latitude: IMPERIAL_HOME.latitude,

        longitude: IMPERIAL_HOME.longitude,

        capacity: Number(form.capacity),

        bedrooms: Number(form.bedrooms),

        bathrooms: Number(form.bathrooms),

        living_areas: Number(form.living_areas),

        nightly_rate_xaf: Number(form.nightly_rate_xaf),

        cleaning_fee_xaf: Number(form.cleaning_fee_xaf) || 0,

        security_deposit_xaf: Number(form.security_deposit_xaf) || 0,

        weekly_discount_percent: 0,

        monthly_discount_percent: 0,

        guide_fr: form.guide_fr,

        guide_en: form.guide_en,

        access_notes_fr: form.access_notes_fr,

        access_notes_en: form.access_notes_en,

        rules_en: form.rules_en,

        rules_fr: form.rules_fr,

        status: form.status,

      }



      let propertyId = id

      if (isNew) {

        const { data, error: insertError } = await supabase.from('properties').insert(payload).select('id').single()

        if (insertError) throw insertError

        propertyId = data.id

      } else {

        const { error: updateError } = await supabase.from('properties').update(payload).eq('id', id)

        if (updateError) throw updateError

      }



      if (!propertyId) throw new Error('Missing property id')



      for (const file of createPendingFiles) {

        await uploadAndAddPropertyImage(file, propertyId, form.name)

      }

      setCreatePendingFiles([])

      await invalidateSiteData(client, propertyId, payload.slug)

      if (isNew) {

        navigate(`/admin/properties/${propertyId}`)

      } else if (propertyId) {

        await reloadImages(propertyId)

      }

    } catch (err) {

      setError(err instanceof Error ? err.message : t('admin.roomSaveError'))

    } finally {

      setSaving(false)

    }

  }



  async function onDelete() {

    if (isNew || !id || !supabase) return

    if (!window.confirm(t('admin.roomDeleteConfirm', { name: form.name }))) return

    setSaving(true)

    setError(null)

    try {

      const { count, error: countError } = await supabase

        .from('reservations')

        .select('id', { count: 'exact', head: true })

        .eq('property_id', id)

      if (countError) throw countError

      if (count && count > 0) {

        setError(t('admin.roomDeleteBlocked'))

        return

      }

      const { error: deleteError } = await supabase.from('properties').delete().eq('id', id)

      if (deleteError) throw deleteError

      await invalidateSiteData(client, id, form.slug)

      navigate('/admin/properties')

    } catch (err) {

      setError(err instanceof Error ? err.message : t('admin.roomDeleteError'))

    } finally {

      setSaving(false)

    }

  }



  return (

    <div className="p-6 md:p-10">

      <Helmet>

        <title>{isNew ? t('admin.roomNew') : form.name} | Impérial Home</title>

      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-4">

        <h1 className="font-display text-4xl">{isNew ? t('admin.roomNew') : t('admin.roomEdit', { name: form.name })}</h1>

        {!isNew ? (

          <Button type="button" variant="outline" onClick={() => void onDelete()} disabled={saving}>

            {t('admin.roomDelete')}

          </Button>

        ) : null}

      </div>



      <form className="surface-light mt-8 grid max-w-3xl gap-5 border border-line p-6" onSubmit={(e) => void onSubmit(e)}>

        <div className="grid gap-4 md:grid-cols-2">

          <div>

            <Label>{t('admin.roomName')}</Label>

            <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required placeholder="Abidjan" />

          </div>

          <div>

            <Label>{t('admin.roomPrice')}</Label>

            <Input

              type="number"

              min={0}

              value={form.nightly_rate_xaf}

              onChange={(e) => setField('nightly_rate_xaf', Number(e.target.value))}

              required

            />

          </div>

        </div>



        <div>

          <Label>{t('admin.roomSlug')}</Label>

          <Input

            value={form.slug}

            onChange={(e) => {

              setSlugManual(true)

              setField('slug', e.target.value)

            }}

            required

          />

          <p className="mt-1 text-sm text-[var(--surface-muted)]">{t('admin.roomSlugHint')}</p>

        </div>



        <div className="grid gap-4 md:grid-cols-3">

          <div className="md:col-span-2">

            <Label>{t('admin.roomAddress')}</Label>

            <Input value={form.address} onChange={(e) => setField('address', e.target.value)} required />

          </div>

          <div>

            <Label>{t('admin.roomCity')}</Label>

            <Input value={form.city} onChange={(e) => setField('city', e.target.value)} required />

          </div>

        </div>

        <div>

          <Label>{t('admin.roomNeighborhood')}</Label>

          <Input value={form.neighborhood} onChange={(e) => setField('neighborhood', e.target.value)} />

        </div>



        <div>

          <Label>{t('admin.roomPhotos')}</Label>

          <p className="mt-1 text-sm text-[var(--surface-muted)]">{t('admin.roomPhotosHint')}</p>

          {isNew && createPendingFiles.length === 0 ? (

            <p className="mt-2 text-sm text-[var(--surface-muted)]">{t('admin.roomPhotosNewHint')}</p>

          ) : null}

          <div className="mt-3 flex flex-wrap gap-3">

            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>

              {t('admin.roomUploadPhotos')}

            </Button>

            <input

              ref={fileRef}

              type="file"

              accept="image/*"

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

              disabled={isNew}

            />

            <Button type="button" variant="ghost" onClick={() => void onAddPhotoUrl()} disabled={isNew}>

              {t('admin.roomAddPhotoUrl')}

            </Button>

          </div>

          {mediaError ? <p className="mt-2 text-sm text-red-600">{mediaError}</p> : null}

          {createPendingFiles.length > 0 ? (

            <p className="mt-3 text-sm text-[var(--surface-muted)]">

              {t('admin.roomPhotosPending', { count: createPendingFiles.length })}

            </p>

          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">

            {images.map((img) => (

              <div key={img.id} className="relative overflow-hidden rounded border border-line">

                <img src={img.url ?? ''} alt="" className="aspect-video w-full object-cover" />

                {img.is_cover ? (

                  <span className="absolute left-1 top-1 rounded bg-[#d4af6a] px-2 py-0.5 text-[10px] uppercase text-black">

                    {t('admin.roomPhotoCover')}

                  </span>

                ) : null}

                <div className="absolute right-1 top-1 flex flex-col gap-1">

                  {!img.is_cover ? (

                    <button

                      type="button"

                      className="rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase text-white"

                      onClick={() => void onSetCover(img.id)}

                    >

                      {t('admin.roomSetCover')}

                    </button>

                  ) : null}

                  <button

                    type="button"

                    className="rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase text-white"

                    onClick={() => void onRemoveImage(img.id)}

                  >

                    {t('admin.roomPhotoRemove')}

                  </button>

                </div>

              </div>

            ))}

            {createPendingFiles.map((file, i) => (

              <div key={`${file.name}-${i}`} className="relative overflow-hidden rounded border border-dashed border-line">

                <img src={URL.createObjectURL(file)} alt="" className="aspect-video w-full object-cover" />

                <span className="absolute left-1 top-1 rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">

                  {t('admin.roomPhotoPending')}

                </span>

              </div>

            ))}

          </div>

          {!isNew && images.length === 0 && createPendingFiles.length === 0 ? (

            <p className="mt-4 text-sm text-muted">{t('admin.roomPhotosEmpty')}</p>

          ) : null}

        </div>



        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

          <div>

            <Label>{t('property.guests')}</Label>

            <Input type="number" min={1} value={form.capacity} onChange={(e) => setField('capacity', Number(e.target.value))} />

          </div>

          <div>

            <Label>{t('admin.roomStatus')}</Label>

            <Select value={form.status} onChange={(e) => setField('status', e.target.value as PropertyStatus)}>

              <option value="published">{t('admin.statusPublished')}</option>

              <option value="draft">{t('admin.statusDraft')}</option>

              <option value="unpublished">{t('admin.statusUnpublished')}</option>

            </Select>

          </div>

        </div>



        <div>

          <Label>{t('admin.roomDescriptionFr')}</Label>

          <Textarea rows={3} value={form.description_fr} onChange={(e) => setField('description_fr', e.target.value)} />

        </div>

        <div>

          <Label>{t('admin.roomDescriptionEn')}</Label>

          <Textarea rows={3} value={form.description_en} onChange={(e) => setField('description_en', e.target.value)} />

        </div>



        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t('admin.cleaningFee')}</Label>
            <Input type="number" min={0} value={form.cleaning_fee_xaf} onChange={(e) => setField('cleaning_fee_xaf', Number(e.target.value))} />
          </div>
          <div>
            <Label>{t('admin.depositFee')}</Label>
            <Input type="number" min={0} value={form.security_deposit_xaf} onChange={(e) => setField('security_deposit_xaf', Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>{t('admin.guideFr')}</Label>
          <Textarea rows={3} value={form.guide_fr} onChange={(e) => setField('guide_fr', e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.guideEn')}</Label>
          <Textarea rows={3} value={form.guide_en} onChange={(e) => setField('guide_en', e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.accessFr')}</Label>
          <Textarea rows={2} value={form.access_notes_fr} onChange={(e) => setField('access_notes_fr', e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.accessEn')}</Label>
          <Textarea rows={2} value={form.access_notes_en} onChange={(e) => setField('access_notes_en', e.target.value)} />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}



        <div className="flex flex-wrap gap-3">

          <Button type="submit" disabled={saving}>

            {saving ? <Loader size="xs" /> : t('common.save')}

          </Button>

          <Button variant="ghost" to="/admin/properties">

            {t('common.cancel')}

          </Button>

        </div>

      </form>

    </div>

  )

}
