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
      className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#111]', ring && 'ring-2 ring-[#d4af6a]')}
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
    <div className="flex h-full min-h-0 flex-col bg-[#0b0b0c] text-[#f4ecd9]">
      {archived ? (
        <button type="button" className="flex min-h-14 items-center gap-3 px-3 text-[17px] font-medium text-[#d4af6a]" onClick={onArchived}>
          <ArrowLeft className="h-5 w-5 rtl:scale-x-[-1]" />
          {archivedLabel}
        </button>
      ) : (
        <h1 className="px-4 pt-3 pb-2">{title}</h1>
      )}
      {archived ? null : (
        <button type="button" className="flex items-center gap-4 px-4 py-3 text-left text-[#d4af6a]/90" onClick={onArchived}>
          <span className="grid h-10 w-10 place-items-center text-[#d4af6a]">
            <Archive className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <span className="text-[16px]">{archivedLabel}</span>
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && archived ? <p className="px-4 py-6 text-[14px] text-[#9d9a90]">{archivedEmpty}</p> : null}
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpen(row.id)}
            className={cn('flex w-full gap-3 px-4 text-left', activeId === row.id && 'bg-[#d4af6a]/10')}
          >
            <span className="py-2">
              <Avatar url={row.avatarUrl} title={row.title} mark={row.mark} ring={row.ring} />
            </span>
            <span className="min-w-0 flex-1 border-b border-[#d4af6a]/15 py-2.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate [font-family:var(--font-display)] text-[16px] tracking-wide text-[#f4ecd9]">{row.title}</span>
                <span className={cn('shrink-0 text-[12px]', row.unread ? 'text-[#d4af6a]' : 'text-[#9d9a90]')}>{chatWhen(row.at, locale)}</span>
              </span>
              <span className="mt-0.5 flex items-start gap-2">
                <span className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug text-[#9d9a90]">
                  {row.photo ? <Camera className="me-1 inline h-4 w-4 align-text-bottom" aria-label={photoLabel} /> : null}
                  {row.preview}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {row.pinned ? <Pin className="h-4 w-4 fill-[#d4af6a] text-[#d4af6a]" /> : null}
                  {row.unread > 0 ? (
                    <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[#d4af6a] px-1.5 text-[12px] font-semibold text-black">
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
