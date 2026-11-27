import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, languageCode, languageShort } from '../../lib/languages'
import { Flag } from '../ui/Flag'
import { cn } from '../../lib/cn'

export function LanguageDock({ placement = 'float' }: { placement?: 'float' | 'header' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState(() => window.location.pathname)
  const current = LANGUAGES.find((item) => item.code === languageCode(i18n.language)) ?? LANGUAGES[0]
  const floating = placement === 'float'

  useEffect(() => {
    if (!floating) return
    const sync = () => setPath(window.location.pathname)
    const push = history.pushState.bind(history)
    const replace = history.replaceState.bind(history)
    history.pushState = (...args: Parameters<History['pushState']>) => {
      push(...args)
      sync()
    }
    history.replaceState = (...args: Parameters<History['replaceState']>) => {
      replace(...args)
      sync()
    }
    window.addEventListener('popstate', sync)
    return () => {
      history.pushState = push
      history.replaceState = replace
      window.removeEventListener('popstate', sync)
    }
  }, [floating])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [open])

  if (floating && path.startsWith('/admin')) return null

  return (
    <div
      data-lang-dock
      className={floating ? 'fixed z-50' : 'relative z-50'}
      style={
        floating
          ? {
              left: 'max(0.75rem, env(safe-area-inset-left))',
              bottom: 'max(5.25rem, calc(env(safe-area-inset-bottom) + 4.5rem))',
            }
          : undefined
      }
    >
      {open ? (
        <ul
          className={cn(
            'max-h-[min(24rem,70dvh)] w-56 overflow-y-auto rounded-2xl border border-accent/25 bg-panel py-1 text-panel-fg shadow-2xl',
            floating ? 'mb-2' : 'absolute right-0 top-full z-50 mt-2',
          )}
          role="listbox"
          aria-label={t('common.language')}
        >
          {LANGUAGES.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={item.code === current.code}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 px-3 text-left text-base touch-manipulation',
                  item.code === current.code ? 'bg-accent-strong text-on-accent' : 'hover:bg-accent-soft',
                )}
                onClick={() => {
                  void i18n.changeLanguage(item.code)
                  setOpen(false)
                }}
              >
                <Flag country={item.country} className="h-5 text-xl" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className={cn(
          'ih-btn inline-flex items-center gap-1.5 rounded-full border border-line bg-[var(--panel)]/85 font-semibold text-[var(--page-fg)] shadow-[var(--shadow-soft)] backdrop-blur-xl touch-manipulation',
          floating ? 'min-h-11 px-2.5 text-sm' : 'h-9 px-2 text-xs',
        )}
        aria-expanded={open}
        aria-label={`${t('common.language')}: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Flag country={current.country} className={floating ? 'h-4' : 'h-3.5'} />
        {floating ? <span>{languageShort(current.code)}</span> : null}
        {floating ? <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /> : null}
      </button>
    </div>
  )
}
