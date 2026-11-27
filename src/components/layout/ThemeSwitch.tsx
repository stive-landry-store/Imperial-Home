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
        'ih-btn inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-line bg-[var(--card-bg)]/70 px-2.5 text-[13px] font-medium text-[var(--page-fg)] backdrop-blur hover:bg-accent-soft hover:text-accent',
      )}
      aria-label={light ? t('common.darkMode') : t('common.lightMode')}
      aria-pressed={light}
    >
      {light ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      {compact ? null : <span>{light ? t('common.darkMode') : t('common.lightMode')}</span>}
    </button>
  )
}
