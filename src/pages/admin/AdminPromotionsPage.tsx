import { useState, type FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Helmet } from 'react-helmet-async'

import { useTranslation } from 'react-i18next'

import { fetchPromotions, fetchPublishedProperties } from '../../lib/data'

import { invalidateSiteData } from '../../lib/queryCache'

import { supabase } from '../../lib/supabase'

import { Button } from '../../components/ui/Button'

import { Input, Label, Select } from '../../components/ui/Field'

import { Badge } from '../../components/ui/Badge'



export function AdminPromotionsPage() {

  const { t } = useTranslation()

  const client = useQueryClient()

  const { data: promotions = [] } = useQuery({ queryKey: ['promotions'], queryFn: fetchPromotions })

  const { data: properties = [] } = useQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties })

  const [name, setName] = useState('')

  const [code, setCode] = useState('')

  const [value, setValue] = useState(10)

  const [propertyId, setPropertyId] = useState('')



  const create = useMutation({

    mutationFn: async () => {

      if (!supabase) throw new Error('Supabase required')

      const today = new Date().toISOString().slice(0, 10)

      const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

      const { data, error } = await supabase

        .from('promotions')

        .insert({

          name,

          code: code.trim() || null,

          discount_type: 'percent',

          discount_value: value,

          starts_at: today,

          ends_at: end,

          is_active: true,

        })

        .select('id')

        .single()

      if (error) throw error

      if (propertyId) {

        await supabase.from('promotion_properties').insert({ promotion_id: data.id, property_id: propertyId })

      }

    },

    onSuccess: () => {

      setName('')

      setCode('')

      void invalidateSiteData(client)

    },

  })



  return (

    <div className="p-6 md:p-10">

      <Helmet>

        <title>{t('admin.promotions')} | Imperial Home</title>

      </Helmet>

      <h1 className="font-display text-4xl">{t('admin.promotions')}</h1>

      <form

        className="surface-light mt-8 grid max-w-xl gap-3 border border-line p-5"

        onSubmit={(e: FormEvent) => {

          e.preventDefault()

          create.mutate()

        }}

      >

        <div>

          <Label>{t('admin.promoName')}</Label>

          <Input value={name} onChange={(e) => setName(e.target.value)} required />

        </div>

        <div>

          <Label>{t('admin.promoCodeAdmin')}</Label>

          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HOME10" />

        </div>

        <div>

          <Label>{t('admin.promoPercent')}</Label>

          <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />

        </div>

        <div>

          <Label>{t('admin.room')}</Label>

          <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>

            <option value="">{t('admin.selectRoom')}</option>

            {properties.map((p) => (

              <option key={p.id} value={p.id}>

                {p.name}

              </option>

            ))}

          </Select>

        </div>

        <Button type="submit">{t('admin.createPromo')}</Button>

      </form>

      <ul className="mt-8 space-y-3">

        {promotions.map((p) => (

          <li key={p.id} className="surface-light flex items-center justify-between border border-line px-4 py-3">

            <div>

              <p className="font-medium text-[var(--surface-fg)]">{p.name}</p>

              <p className="text-sm text-[var(--surface-muted)]">

                {p.code ? `${p.code} · ` : ''}

                {p.discount_value}

                {p.discount_type === 'percent' ? '%' : ' XAF'} · {p.starts_at} → {p.ends_at}

              </p>

              {p.description_fr || p.description_en ? (

                <p className="mt-1 text-sm text-[var(--surface-muted)]">

                  {p.description_fr || p.description_en}

                </p>

              ) : null}

            </div>

            <Badge variant="light">{p.is_active ? t('admin.active') : t('admin.inactive')}</Badge>

          </li>

        ))}

      </ul>

    </div>

  )

}

