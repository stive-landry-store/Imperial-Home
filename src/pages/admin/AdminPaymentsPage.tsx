import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAllReservations } from '../../lib/data'
import { formatXaf } from '../../lib/format'
import { receiptUrl } from '../../lib/guest'
import { Badge } from '../../components/ui/Badge'

function ReceiptLink({ path }: { path: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="text-sm text-[#d4af6a]"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void receiptUrl(path)
          .then((url) => {
            if (url) window.open(url, '_blank')
          })
          .finally(() => setBusy(false))
      }}
    >
      Reçu
    </button>
  )
}

export function AdminPaymentsPage() {
  const { t } = useTranslation()
  const { data = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.payments')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.payments')}</h1>
      <ul className="surface-light mt-8 divide-y divide-line border border-line">
        {data.map((r) => {
          const pay = r.payments?.[0]
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-base">
              <Link to={`/admin/reservations/${r.id}`} className="hover:text-gold">
                {r.public_code}
              </Link>
              <span>{formatXaf(r.total_amount_xaf)}</span>
              <Badge>{pay ? t(`status.${pay.status}`) : t(`status.${r.status}`)}</Badge>
              {pay?.provider ? <span className="text-xs uppercase theme-muted">{pay.provider}</span> : null}
              {pay?.metadata?.receipt_path ? <ReceiptLink path={pay.metadata.receipt_path} /> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
