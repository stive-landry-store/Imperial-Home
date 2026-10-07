import { useTranslation } from 'react-i18next'
import { isSupabaseConfigured } from '../../lib/supabase'

export function SetupBanner() {
  const { t } = useTranslation()
  if (isSupabaseConfigured()) return null
  return (
    <div className="border-b border-[#d4af6a]/30 bg-[#faf6ee] text-center text-sm tracking-wide text-[#8b6f32]">
      <p className="px-4 py-2">{t('setup.banner')}</p>
    </div>
  )
}
