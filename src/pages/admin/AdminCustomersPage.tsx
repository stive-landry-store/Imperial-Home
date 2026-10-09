import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import type { Profile } from '../../types/database'

export function AdminCustomersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function write(customerId: string) {
    if (!supabase) return
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('open_customer_conversation', { p_customer_id: customerId })
    if (rpcError || !data) {
      setError(rpcError?.message ?? t('common.error'))
      return
    }
    navigate(`/admin/chat?c=${data}`)
  }
  const { data = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
  })

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.customers')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.customers')}</h1>
      <ul className="surface-light mt-8 divide-y divide-line border border-line">
        {data.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate">{c.full_name || '—'}</p>
              <p className="truncate text-base text-muted">
                {c.email} · {c.phone}
              </p>
            </div>
            <Button type="button" className="min-h-12 w-full sm:w-auto" onClick={() => void write(c.id)}>
              {t('admin.writeCustomer')}
            </Button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
