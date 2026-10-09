import { useTranslation } from 'react-i18next'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { visibleMessage } from '../../lib/chatText'
import type { Message } from '../../types/database'
import { cn } from '../../lib/cn'

export type ChatSender = { id: string; full_name: string; is_verified: boolean }

export function ChatLine({ message, senders }: { message: Message; senders: ChatSender[] }) {
  const { t } = useTranslation()
  const sender = senders.find((item) => item.id === message.sender_id)
  const mine = message.role === 'customer'
  const name =
    message.role === 'system'
      ? t('chat.team')
      : message.role === 'assistant'
        ? t('chat.team')
        : sender?.full_name || (mine ? t('chat.you') : t('chat.team'))
  const verified = message.role === 'admin' && (sender?.is_verified ?? true)

  return (
    <div className={cn('max-w-[92%]', mine ? 'ml-auto text-right' : 'mr-auto')}>
      <p className={cn('mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#d4af6a]', mine && 'justify-end')}>
        <span className="truncate">{name}</span>
        {verified ? <VerifiedBadge title={t('admin.verified')} /> : null}
      </p>
      <p className="whitespace-pre-wrap text-base">{visibleMessage(message.body, t)}</p>
    </div>
  )
}
