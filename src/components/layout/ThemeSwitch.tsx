import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()
  const light = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 border-2 border-[#c4a35a] bg-black/40 px-2.5 py-1.5 text-[13px] tracking-[0.16em] text-[#d4af6a] uppercase hover:bg-[#c4a35a]/20',
      )}
      aria-label={light ? t('common.darkMode') : t('common.lightMode')}
      aria-pressed={light}
    >
      {light ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      {compact ? null : <span>{light ? t('common.darkMode') : t('common.lightMode')}</span>}
    </button>
  )
}
