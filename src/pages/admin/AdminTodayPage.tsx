import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { fetchAllReservations, fetchPublishedProperties } from '../../lib/data'
import { todayIso } from '../../lib/availability'
import { AdminInsights } from '../../components/admin/AdminInsights'

export function AdminTodayPage() {
  const { t } = useTranslation()
  const today = todayIso()
  const { data: reservations = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const { data: properties = [] } = useQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties })

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{`${t('app.today')} | Imperial Home`}</title>
      </Helmet>
      <Link to="/admin" className="inline-flex min-h-11 items-center gap-1 text-sm text-[#d4af6a]">
        <ChevronLeft size={18} className="rtl:scale-x-[-1]" />
        {t('admin.dashboard')}
      </Link>
      <AdminInsights reservations={reservations} properties={properties} today={today} view="today" />
    </div>
  )
}
