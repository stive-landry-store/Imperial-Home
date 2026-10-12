import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { addStayService, fetchStayServicesForAdmin, removeStayService } from '../../lib/guest'
import { formatXaf } from '../../lib/format'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Field'

export function StayExtrasEditor() {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: services = [] } = useQuery({ queryKey: ['stay-services-admin'], queryFn: fetchStayServicesForAdmin })

  const add = useMutation({
    mutationFn: () => addStayService(name, Math.round(Number(price))),
    onSuccess: async () => {
      setName('')
      setPrice('')
      setError(null)
      await client.invalidateQueries({ queryKey: ['stay-services-admin'] })
      await client.invalidateQueries({ queryKey: ['stay-services'] })
    },
    onError: () => setError(t('admin.extrasError')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => removeStayService(id),
    onSuccess: async () => {
      setError(null)
      await client.invalidateQueries({ queryKey: ['stay-services-admin'] })
      await client.invalidateQueries({ queryKey: ['stay-services'] })
    },
    onError: () => setError(t('admin.extrasError')),
  })

  const priceOk = Number.isFinite(Number(price)) && Number(price) >= 0 && price.trim() !== ''
  const canAdd = name.trim().length > 1 && priceOk && !add.isPending

  return (
    <section className="surface-light mt-8 max-w-xl space-y-4 border border-line p-6">
      <div>
        <h2 className="text-lg font-semibold">{t('admin.extrasTitle')}</h2>
        <p className="mt-1 text-sm text-[var(--surface-muted)]">{t('admin.extrasHint')}</p>
      </div>
      {services.length === 0 ? <p className="text-sm text-[var(--surface-muted)]">{t('admin.extrasEmpty')}</p> : null}
      <ul className="space-y-2">
        {services.map((service) => (
          <li key={service.id} className="flex items-center justify-between gap-3 border border-line px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate">{i18n.language.startsWith('en') ? service.name_en : service.name_fr}</span>
              <span className="text-sm text-[var(--surface-muted)]">{formatXaf(service.price_xaf)}</span>
            </span>
            <Button type="button" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(service.id)}>
              {t('admin.extrasRemove')}
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <div>
          <Label>{t('admin.extrasName')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.extrasPrice')}</Label>
          <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} />
        </div>
        <Button type="button" disabled={!canAdd} onClick={() => add.mutate()}>
          {t('admin.extrasAdd')}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  )
}
