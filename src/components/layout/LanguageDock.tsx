import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, languageCode } from '../../lib/languages'
import { cn } from '../../lib/cn'

export function LanguageDock() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find((item) => item.code === languageCode(i18n.language)) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [open])

  return (
    <div
      className="fixed z-50"
      style={{
        left: 'max(0.75rem, env(safe-area-inset-left))',
        bottom: 'max(5.25rem, calc(env(safe-area-inset-bottom) + 4.5rem))',
      }}
    >
      {open ? (
        <ul
          className="mb-2 max-h-[min(24rem,70dvh)] w-56 overflow-y-auto border border-[#d4af6a]/40 bg-black py-1 text-[#f4eee3] shadow-2xl"
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
                  item.code === current.code ? 'bg-[#c4a35a] text-black' : 'hover:bg-white/10',
                )}
                onClick={() => {
                  void i18n.changeLanguage(item.code)
                  setOpen(false)
                }}
              >
                <span className="text-xl" aria-hidden>
                  {item.flag}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="inline-flex min-h-12 items-center gap-2 border border-[#c4a35a] bg-black/90 px-3 text-sm text-[#d4af6a] shadow-lg touch-manipulation"
        aria-expanded={open}
        aria-label={t('common.language')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-lg" aria-hidden>
          {current.flag}
        </span>
        <span>{current.label}</span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
    </div>
  )
}
