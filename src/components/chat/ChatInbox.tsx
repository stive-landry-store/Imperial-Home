import { Archive, ArrowLeft, Camera, Pin } from 'lucide-react'
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
    <span
      className={cn('ih-chat-avatar grid shrink-0 place-items-center overflow-hidden rounded-full', ring && 'ih-avatar-ring')}
      style={{ width: size, height: size }}
    >
      {mark ? (
        <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="h-[62%] w-[62%] object-contain" />
      ) : url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[18px] font-semibold text-white">{title.slice(0, 1).toUpperCase()}</span>
      )}
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
  return (
    <div className="ih-chat ih-chat-skin flex h-full min-h-0 flex-col">
      {archived ? (
        <button type="button" className="flex min-h-14 items-center gap-3 px-3 text-[17px] font-medium" onClick={onArchived}>
          <ArrowLeft className="h-5 w-5 rtl:scale-x-[-1]" />
          {archivedLabel}
        </button>
      ) : (
        <h1 className="px-4 pt-3 pb-2">{title}</h1>
      )}
      {archived ? null : (
        <button type="button" className="ih-chat-muted ih-inbox-archive flex items-center gap-4 px-4 py-3 text-left" onClick={onArchived}>
          <span className="grid h-10 w-10 place-items-center">
            <Archive className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <span className="text-[16px]">{archivedLabel}</span>
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && archived ? <p className="ih-chat-muted ih-fade-up px-4 py-6 text-[14px]">{archivedEmpty}</p> : null}
        {rows.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpen(row.id)}
            className={cn('ih-inbox-row flex w-full gap-3 px-4 text-left', activeId === row.id && 'is-active')}
            style={{ ['--ih-i' as string]: Math.min(index, 12) }}
          >
            <span className="py-2">
              <Avatar url={row.avatarUrl} title={row.title} mark={row.mark} ring={row.ring} />
            </span>
            <span className="ih-inbox-line min-w-0 flex-1 py-2.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[16px] font-medium">{row.title}</span>
                <span className={cn('shrink-0 text-[12px]', row.unread ? 'ih-chat-accent font-semibold' : 'ih-chat-muted')}>{chatWhen(row.at, locale)}</span>
              </span>
              <span className="mt-0.5 flex items-start gap-2">
                <span className="ih-chat-muted line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug">
                  {row.photo ? <Camera className="me-1 inline h-4 w-4 align-text-bottom" aria-label={photoLabel} /> : null}
                  {row.preview}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {row.pinned ? <Pin className="ih-chat-muted h-4 w-4" /> : null}
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
