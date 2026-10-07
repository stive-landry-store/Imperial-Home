import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'

export function LocaleSwitch({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const fr = i18n.language.startsWith('fr')

  return (
    <div className="flex items-center gap-2">
      {compact ? null : (
        <span className="hidden text-[12px] tracking-[0.18em] text-[#d4af6a] uppercase lg:inline">{t('common.language')}</span>
      )}
      <div
        className={cn(
          'inline-flex overflow-hidden border-2 border-[#c4a35a] bg-black/40 text-[13px] font-semibold tracking-[0.16em] uppercase',
          compact ? '' : 'shadow-[0_0_12px_rgba(196,163,90,0.25)]',
        )}
        role="group"
        aria-label={t('common.language')}
      >
        <button
          type="button"
          className={cn('min-w-10 px-3 py-1.5', fr ? 'bg-[#c4a35a] text-black' : 'text-[#d4af6a] hover:bg-[#c4a35a]/20')}
          onClick={() => void i18n.changeLanguage('fr')}
          aria-pressed={fr}
        >
          FR
        </button>
        <button
          type="button"
          className={cn('min-w-10 px-3 py-1.5', !fr ? 'bg-[#c4a35a] text-black' : 'text-[#d4af6a] hover:bg-[#c4a35a]/20')}
          onClick={() => void i18n.changeLanguage('en')}
          aria-pressed={!fr}
        >
          EN
        </button>
      </div>
    </div>
  )
}
