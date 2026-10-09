import { useState } from 'react'
import { Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const KEY = 'ih-assistant-notice-dismissed'

/** Bandeau bot, dans le flux de la page, au-dessus du pied de page. */
export function AssistantNotice() {
  const { t } = useTranslation()
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === '1')

  if (hidden) return null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4" aria-live="polite">
      <div className="flex gap-3 rounded-xl border border-black/10 bg-[var(--header-solid)] px-4 py-3 text-sm leading-snug">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af6a]" aria-hidden />
        <div>
          <p>{t('assistant.notice')}</p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-[#c4a35a]"
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
