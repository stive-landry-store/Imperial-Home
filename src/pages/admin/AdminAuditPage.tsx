import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

export function AdminAuditPage() {
  const { t } = useTranslation()
  const { data = [] } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return data as { id: string; action: string; entity_type: string; created_at: string; entity_id: string | null }[]
    },
  })

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.audit')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.audit')}</h1>
      <ul className="surface-light mt-8 divide-y divide-line border border-line text-base">
        {data.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <p>
              {row.action} · {row.entity_type}
            </p>
            <p className="text-sm text-muted">{new Date(row.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
