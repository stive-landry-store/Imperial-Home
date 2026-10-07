import { useState } from 'react'
import { Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const KEY = 'ih-assistant-notice-dismissed'

/** Bandeau bot — fixe en bas à gauche, sans chevaucher le menu du haut. */
export function AssistantNotice() {
  const { t } = useTranslation()
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === '1')

  if (hidden) return null

  return (
    <div
      className="pointer-events-none fixed bottom-36 left-4 z-40 max-w-[min(100%,22rem)] md:bottom-40 md:left-6"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex gap-3 rounded-lg border border-[#d4af6a]/45 bg-black/95 px-4 py-3 text-sm leading-snug text-white shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af6a]" aria-hidden />
        <div>
          <p>{t('assistant.notice')}</p>
          <button
            type="button"
            className="mt-2 text-xs uppercase tracking-wider text-[#d4af6a] hover:text-[#e0c57a]"
            onClick={() => {
              localStorage.setItem(KEY, '1')
              setHidden(true)
            }}
          >
            {t('assistant.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
