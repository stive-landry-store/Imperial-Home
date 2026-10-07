import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/database'

export function AdminCustomersPage() {
  const { t } = useTranslation()
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
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.customers')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.customers')}</h1>
      <ul className="surface-light mt-8 divide-y divide-line border border-line">
        {data.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <p>{c.full_name || '—'}</p>
            <p className="text-base text-muted">
              {c.email} · {c.phone}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
