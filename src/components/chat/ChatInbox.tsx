import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ArrowLeft, Camera, Pin, Search, X } from 'lucide-react'
import { chatWhen } from '../../lib/chatText'
import { cn } from '../../lib/cn'

export type InboxRow = {
  id: string
  title: string
  preview: string
  at: string | null
  avatarUrl?: string | null
  mark?: boolean
  unread: number
  pinned?: boolean
  photo?: boolean
  ring?: boolean
}

type Filter = 'all' | 'unread' | 'pinned'

function Avatar({
  url,
  title,
  mark,
  ring,
  size = 52,
}: {
  url?: string | null
  title: string
  mark?: boolean
  ring?: boolean
  size?: number
}) {
  return (
    <span className="relative shrink-0">
      <span
        className={cn('ih-chat-avatar grid place-items-center overflow-hidden rounded-full', ring && 'ih-avatar-ring')}
        style={{ width: size, height: size }}
      >
        {mark ? (
          <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="h-[62%] w-[62%] object-contain" />
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[18px] font-semibold text-accent">{title.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      {mark ? <span className="ih-presence" aria-hidden /> : null}
    </span>
  )
}

export function ChatInbox({
  title,
  rows,
  activeId,
  archived,
  archivedLabel,
  archivedEmpty,
  locale,
  photoLabel,
  onArchived,
  onOpen,
}: {
  title: string
  rows: InboxRow[]
  activeId: string | null
  archived: boolean
  archivedLabel: string
  archivedEmpty: string
  locale: string
  photoLabel: string
  onArchived: () => void
  onOpen: (id: string) => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const unreadTotal = rows.reduce((sum, row) => sum + (row.unread > 0 ? 1 : 0), 0)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === 'unread' && row.unread === 0) return false
      if (filter === 'pinned' && !row.pinned) return false
      if (!q) return true
      return row.title.toLowerCase().includes(q) || row.preview.toLowerCase().includes(q)
    })
  }, [rows, query, filter])

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: t('chat.filterAll') },
    { key: 'unread', label: t('chat.filterUnread'), count: unreadTotal },
    { key: 'pinned', label: t('chat.filterPinned') },
  ]
  const activeIndex = filters.findIndex((item) => item.key === filter)

  return (
    <div className="ih-chat ih-chat-skin ih-inbox flex h-full min-h-0 flex-col">
      <div className="ih-inbox-top shrink-0 px-4 pt-3 pb-2">
        {archived ? (
          <button type="button" className="ih-icon-btn -ms-2 flex min-h-12 items-center gap-2 rounded-full px-2 text-[18px] font-semibold" onClick={onArchived}>
            <ArrowLeft className="h-5 w-5 rtl:scale-x-[-1]" />
            {archivedLabel}
          </button>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <h1>{title}</h1>
            {unreadTotal > 0 ? (
              <span key={unreadTotal} className="ih-unread ih-pop mb-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
                {unreadTotal}
              </span>
            ) : null}
          </div>
        )}
        <label className="ih-chat-input ih-inbox-search mt-3 flex items-center gap-2 rounded-full px-3.5 py-2.5">
          <Search className="ih-chat-muted h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('chat.search')}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          {query ? (
            <button type="button" className="ih-pop grid h-6 w-6 place-items-center rounded-full bg-[var(--chat-line)]" aria-label="×" onClick={() => setQuery('')}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        {archived ? null : (
          <div className="ih-segment relative mt-3 grid grid-cols-3 rounded-full p-1" style={{ ['--seg' as string]: activeIndex }}>
            <span className="ih-segment-pill absolute inset-y-1 start-1 rounded-full" aria-hidden />
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                className={cn('relative z-[1] flex min-h-9 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors', filter === item.key ? 'text-[var(--chat-fg)]' : 'ih-chat-muted')}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                {item.count ? <span className="rounded-full bg-accent-strong px-1.5 text-[10px] leading-4 text-on-accent">{item.count}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      {archived ? null : (
        <button type="button" className="ih-chat-muted ih-inbox-archive mx-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left" onClick={onArchived}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--chat-input)]">
            <Archive className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-[15px] font-medium">{archivedLabel}</span>
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {rows.length === 0 && archived ? <p className="ih-chat-muted ih-fade-up px-4 py-6 text-[14px]">{archivedEmpty}</p> : null}
        {rows.length > 0 && shown.length === 0 ? (
          <div className="ih-fade-up flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
              <Search className="h-6 w-6" />
            </span>
            <p className="ih-chat-muted mt-3 text-[14px]">{t('chat.noResults')}</p>
          </div>
        ) : null}
        {shown.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpen(row.id)}
            className={cn('ih-inbox-row flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left', activeId === row.id && 'is-active', row.unread > 0 && 'is-unread')}
            style={{ ['--ih-i' as string]: Math.min(index, 12) }}
          >
            <Avatar url={row.avatarUrl} title={row.title} mark={row.mark} ring={row.ring} />
            <span className="min-w-0 flex-1 py-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className={cn('truncate text-[16px]', row.unread ? 'font-bold' : 'font-medium')}>{row.title}</span>
                <span className={cn('shrink-0 text-[12px]', row.unread ? 'ih-chat-accent font-semibold' : 'ih-chat-muted')}>{chatWhen(row.at, locale)}</span>
              </span>
              <span className="mt-0.5 flex items-start gap-2">
                <span className={cn('line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug', row.unread ? 'text-[var(--chat-fg)]' : 'ih-chat-muted')}>
                  {row.photo ? <Camera className="me-1 inline h-4 w-4 align-text-bottom" aria-label={photoLabel} /> : null}
                  {row.preview}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {row.pinned ? <Pin className="ih-chat-muted h-4 w-4 rotate-45" /> : null}
                  {row.unread > 0 ? (
                    <span key={row.unread} className="ih-unread ih-pop grid min-h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold">
                      {row.unread > 99 ? '99+' : row.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
