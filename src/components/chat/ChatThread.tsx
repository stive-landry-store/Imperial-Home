import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowLeft, Camera, Check, Copy, CornerUpLeft, ImageIcon, LifeBuoy, Plus, Search, SendHorizontal, Smile, X } from 'lucide-react'
import { chatDay } from '../../lib/chatText'
import { cn } from '../../lib/cn'
import { ImageLightbox } from '../ui/ImageLightbox'

export type Bubble = {
  id: string
  body: string
  at: string
  mine: boolean
  system: boolean
  imageUrl?: string
}

const GROUP_GAP = 5 * 60_000
const EMOJIS = ['👍', '🙏', '😊', '😂', '❤️', '🎉', '👌', '🔑', '🏠', '🚗', '📍', '✅', '⏰', '💳', '🧹', '📶']

function sameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10)
}

function sameGroup(a: Bubble | undefined, b: Bubble | undefined) {
  if (!a || !b || a.system || b.system || a.mine !== b.mine || !sameDay(a.at, b.at)) return false
  return Math.abs(Date.parse(b.at) - Date.parse(a.at)) < GROUP_GAP
}

/** Turns links and phone numbers into tappable links, and marks search matches. */
function richText(text: string, query: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+|\+?\d[\d\s.-]{7,}\d)/g)
  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="ih-msg-link">
          {mark(part, query)}
        </a>
      )
    }
    if (/^\+?\d[\d\s.-]{7,}\d$/.test(part)) {
      return (
        <a key={index} href={`tel:${part.replace(/[^\d+]/g, '')}`} className="ih-msg-link">
          {mark(part, query)}
        </a>
      )
    }
    return <Fragment key={index}>{mark(part, query)}</Fragment>
  })
}

function mark(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return text
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${safe})`, 'gi')).map((piece, index) =>
    piece.toLowerCase() === q.toLowerCase() ? (
      <mark key={index} className="ih-msg-hit">
        {piece}
      </mark>
    ) : (
      <Fragment key={index}>{piece}</Fragment>
    ),
  )
}

/** Lines that start with "> " are shown as a quoted reply above the message. */
function splitQuote(body: string) {
  const lines = body.split('\n')
  const quoted: string[] = []
  while (lines.length && lines[0].startsWith('> ')) quoted.push(lines.shift()!.slice(2))
  return { quote: quoted.join('\n'), rest: lines.join('\n') }
}

export function ChatThread({
  title,
  subtitle,
  avatarUrl,
  mark: showMark,
  messages,
  locale,
  body,
  file,
  placeholder,
  sendLabel,
  cameraLabel,
  attachLabel,
  humanLabel,
  backLabel,
  onBody,
  onSend,
  onBack,
  onPick,
  onHuman,
  quickReplies,
  onQuick,
}: {
  title: string
  subtitle: string
  avatarUrl?: string | null
  mark?: boolean
  messages: Bubble[]
  locale: string
  body: string
  file: File | null
  placeholder: string
  sendLabel: string
  cameraLabel: string
  attachLabel: string
  humanLabel?: string
  backLabel: string
  onBody: (value: string) => void
  onSend: () => void
  onBack: () => void
  onPick: (file: File | null) => void
  onHuman?: () => void
  quickReplies?: string[]
  onQuick?: (text: string) => void
}) {
  const { t } = useTranslation()
  const wall = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const hold = useRef<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [emoji, setEmoji] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [away, setAway] = useState(false)
  const [missed, setMissed] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const seenCount = useRef(messages.length)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const photos = useMemo(() => messages.filter((item) => item.imageUrl).map((item) => item.imageUrl!), [messages])
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? messages.filter((item) => !item.system && item.body.toLowerCase().includes(q)) : []
  }, [messages, query])
  const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale])

  useEffect(() => {
    document.documentElement.classList.add('ih-thread-open')
    return () => document.documentElement.classList.remove('ih-thread-open')
  }, [])

  function toBottom(smooth = true) {
    const node = wall.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    setMissed(0)
  }

  // Follow new messages only when the reader is already at the bottom; otherwise count them.
  useEffect(() => {
    const added = messages.length - seenCount.current
    seenCount.current = messages.length
    const node = wall.current
    if (!node) return
    const last = messages[messages.length - 1]
    if (!away || last?.mine) {
      requestAnimationFrame(() => {
        node.scrollTop = node.scrollHeight
      })
    } else if (added > 0) {
      setMissed((count) => count + added)
    }
  }, [messages, file, away])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!hits.length) return
    const node = document.getElementById(`ih-msg-${hits[hits.length - 1].id}`)
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [hits])

  function onScroll() {
    const node = wall.current
    if (!node) return
    const far = node.scrollHeight - node.scrollTop - node.clientHeight > 160
    setAway(far)
    if (!far) setMissed(0)
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!body.trim() && !file) return
    onSend()
    setEmoji(false)
    if (field.current) field.current.style.height = 'auto'
  }

  function grow(value: string) {
    onBody(value)
    const node = field.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  function copy(item: Bubble) {
    const { rest } = splitQuote(item.body)
    void navigator.clipboard?.writeText(rest.trim() || item.body).then(() => {
      setCopied(item.id)
      window.setTimeout(() => setCopied(null), 1400)
    })
    setFocused(null)
  }

  function reply(item: Bubble) {
    const { rest } = splitQuote(item.body)
    const quoted = (rest.trim() || item.body)
      .split('\n')
      .slice(0, 3)
      .map((line) => `> ${line}`)
      .join('\n')
    grow(`${quoted}\n${body.replace(/^(> .*\n)+/, '')}`)
    setFocused(null)
    window.setTimeout(() => field.current?.focus(), 30)
  }

  function insertEmoji(value: string) {
    const node = field.current
    const start = node?.selectionStart ?? body.length
    const end = node?.selectionEnd ?? body.length
    const next = body.slice(0, start) + value + body.slice(end)
    grow(next)
    window.setTimeout(() => {
      node?.focus()
      node?.setSelectionRange(start + value.length, start + value.length)
    }, 0)
  }

  function startHold(id: string) {
    if (hold.current) window.clearTimeout(hold.current)
    hold.current = window.setTimeout(() => {
      setFocused(id)
      navigator.vibrate?.(12)
    }, 420)
  }

  function endHold() {
    if (hold.current) window.clearTimeout(hold.current)
    hold.current = null
  }

  const ready = Boolean(body.trim() || file)
  const draftQuote = splitQuote(body).quote

  return (
    <div className="ih-thread ih-chat-skin flex h-full min-h-0 flex-col" onClick={() => focused && setFocused(null)}>
      <header className="ih-thread-head ih-chat-head relative z-10 flex h-[64px] shrink-0 items-center gap-1 px-1.5">
        <button type="button" className="ih-icon-btn grid h-10 w-10 place-items-center rounded-full md:hidden" aria-label={backLabel} onClick={onBack}>
          <ArrowLeft className="h-6 w-6 rtl:scale-x-[-1]" />
        </button>
        <span className="relative shrink-0">
          <span className="ih-chat-avatar grid h-10 w-10 place-items-center overflow-hidden rounded-full">
            {showMark ? (
              <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="h-6 w-6 object-contain" />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-accent">{title.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <span className="ih-presence" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 px-1.5">
          <p className="truncate text-[16px] leading-tight font-semibold">{title}</p>
          <p className="ih-chat-status truncate text-[12.5px]">{subtitle}</p>
        </div>
        <button
          type="button"
          className={cn('ih-icon-btn grid h-10 w-10 place-items-center rounded-full', searching && 'is-on')}
          aria-label={t('chat.searchIn')}
          aria-pressed={searching}
          onClick={() => {
            setSearching((value) => !value)
            setQuery('')
          }}
        >
          {searching ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
      </header>

      {searching ? (
        <div className="ih-thread-search ih-chat-bar relative z-10 flex items-center gap-2 px-3 py-2">
          <div className="ih-chat-input flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2">
            <Search className="ih-chat-muted h-4 w-4 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('chat.searchIn')}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
          </div>
          {query.trim() ? (
            <span key={hits.length} className="ih-pop shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent">
              {hits.length} {t('chat.matches')}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="ih-wall-frame relative min-h-0 flex-1">
      <div className="ih-wall-mesh" aria-hidden />
      <div ref={wall} className="ih-chat-wall relative h-full overflow-y-auto px-3 py-3" onScroll={onScroll}>
        {messages.map((item, index) => {
          const previous = messages[index - 1]
          const next = messages[index + 1]
          const showDay = !previous || !sameDay(previous.at, item.at)
          const joinedTop = sameGroup(previous, item)
          const joinedBottom = sameGroup(item, next)
          const { quote, rest } = splitQuote(item.body)
          const isHit = Boolean(query.trim()) && hits.some((hit) => hit.id === item.id)
          const dim = hits.length > 0 && !isHit
          return (
            <div key={item.id} id={`ih-msg-${item.id}`}>
              {showDay ? (
                <p className="ih-chat-day sticky top-1 z-[1] mx-auto my-3 w-fit rounded-full px-3 py-1 text-[12px]">{chatDay(item.at, locale)}</p>
              ) : null}
              {item.system ? (
                <p className="ih-chat-system mx-auto my-3 w-fit max-w-[88%] rounded-2xl px-3 py-1.5 text-center text-[12.5px]">{item.body}</p>
              ) : (
                <div
                  className={cn(
                    'ih-bubble-row group relative flex',
                    item.mine ? 'justify-end' : 'justify-start',
                    joinedBottom ? 'mb-[3px]' : 'mb-2.5',
                    dim && 'is-dim',
                  )}
                  style={{ ['--ih-b' as string]: Math.max(0, Math.min(8, index - (messages.length - 9))) }}
                >
                  <div
                    className={cn(
                      'ih-bubble relative max-w-[80%] px-3.5 pt-2 pb-1.5 md:max-w-[68%]',
                      item.mine ? 'ih-bubble-mine' : 'ih-bubble-theirs',
                      joinedTop && (item.mine ? 'join-top-mine' : 'join-top-theirs'),
                      joinedBottom ? (item.mine ? 'join-bottom-mine' : 'join-bottom-theirs') : 'has-tail',
                      focused === item.id && 'is-focused',
                      isHit && 'is-hit',
                    )}
                    onPointerDown={() => startHold(item.id)}
                    onPointerUp={endHold}
                    onPointerLeave={endHold}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setFocused(item.id)
                    }}
                  >
                    {item.imageUrl ? (
                      <button
                        type="button"
                        className="ih-bubble-photo mb-1 block overflow-hidden rounded-[14px]"
                        onClick={() => setZoom(photos.indexOf(item.imageUrl!))}
                      >
                        <img src={item.imageUrl} alt="" className="max-h-64 w-full object-cover" />
                      </button>
                    ) : null}
                    {quote ? <span className="ih-bubble-quote mb-1.5 block rounded-lg px-2.5 py-1.5 text-[13px] leading-snug whitespace-pre-wrap">{quote}</span> : null}
                    {rest.trim() ? <span className="text-[15px] leading-[20px] break-words whitespace-pre-wrap">{richText(rest, query)}</span> : null}
                    {!joinedBottom ? (
                      <span className="ih-bubble-time float-right ms-3 mt-1.5 inline-flex translate-y-0.5 items-center gap-1 text-[11px] leading-none">
                        {timeFormat.format(new Date(item.at))}
                        {item.mine ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
                      </span>
                    ) : null}
                    {copied === item.id ? (
                      <span className="ih-copied absolute -top-7 left-1/2 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap">{t('chat.copied')}</span>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'ih-bubble-tools absolute top-1/2 z-[2] flex -translate-y-1/2 gap-1',
                      item.mine ? 'end-[calc(80%+0.5rem)] md:end-[calc(68%+0.5rem)]' : 'start-[calc(80%+0.5rem)] md:start-[calc(68%+0.5rem)]',
                      focused === item.id && 'is-open',
                    )}
                  >
                    <button type="button" className="ih-tool grid h-8 w-8 place-items-center rounded-full" aria-label={t('chat.reply')} onClick={() => reply(item)}>
                      <CornerUpLeft className="h-4 w-4" />
                    </button>
                    {rest.trim() || quote ? (
                      <button type="button" className="ih-tool grid h-8 w-8 place-items-center rounded-full" aria-label={t('chat.copy')} onClick={() => copy(item)}>
                        <Copy className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>

      <div className="relative">
        {away ? (
          <button type="button" className="ih-to-bottom absolute end-4 bottom-3 z-10 grid h-11 w-11 place-items-center rounded-full" aria-label={t('chat.latest')} onClick={() => toBottom()}>
            <ArrowDown className="h-5 w-5" />
            {missed > 0 ? (
              <span key={missed} className="ih-unread ih-pop absolute -top-1.5 -end-1 grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold">
                {missed}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      {preview ? (
        <div className="ih-chat-bar ih-attach flex items-center gap-3 px-3 pt-2">
          <img src={preview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          <button type="button" className="ih-icon-btn grid h-9 w-9 place-items-center rounded-full" aria-label="×" onClick={() => onPick(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
      {draftQuote ? (
        <div className="ih-chat-bar ih-draft-quote flex items-start gap-2 px-3 pt-2">
          <CornerUpLeft className="mt-1 h-4 w-4 shrink-0 text-accent" />
          <p className="ih-bubble-quote line-clamp-2 min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-[13px]">{draftQuote}</p>
          <button type="button" className="ih-icon-btn grid h-8 w-8 shrink-0 place-items-center rounded-full" aria-label="×" onClick={() => grow(splitQuote(body).rest)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {quickReplies?.length && onQuick ? (
        <div className="ih-chat-bar ih-quick-row flex gap-2 overflow-x-auto px-3 py-2">
          {quickReplies.map((text, index) => (
            <button
              key={text}
              type="button"
              className="ih-chip shrink-0 rounded-full px-3.5 py-1.5 text-left text-[13px]"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onQuick(text)}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
      {emoji ? (
        <div className="ih-chat-bar ih-emoji-tray grid grid-cols-8 gap-1 px-3 py-2">
          {EMOJIS.map((item, index) => (
            <button
              key={item}
              type="button"
              className="ih-emoji grid h-10 place-items-center rounded-xl text-[22px]"
              style={{ animationDelay: `${index * 18}ms` }}
              onClick={() => insertEmoji(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <form className="ih-thread-form ih-chat-bar relative flex items-end gap-1.5 px-2 py-2" onSubmit={submit}>
        {menu ? (
          <div className="ih-chat-menu ih-sheet absolute bottom-[4.25rem] start-2 z-10 w-64 overflow-hidden rounded-2xl p-1.5">
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px]"
              onClick={() => {
                setMenu(false)
                gallery.current?.click()
              }}
            >
              <span className="ih-menu-icon grid h-9 w-9 place-items-center rounded-xl bg-[#e8f1fb] text-[#2f6fb7]">
                <ImageIcon className="h-5 w-5" />
              </span>
              {attachLabel}
            </button>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px]"
              onClick={() => {
                setMenu(false)
                camera.current?.click()
              }}
            >
              <span className="ih-menu-icon grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
                <Camera className="h-5 w-5" />
              </span>
              {cameraLabel}
            </button>
            {onHuman && humanLabel ? (
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px]"
                onClick={() => {
                  setMenu(false)
                  onHuman()
                }}
              >
                <span className="ih-menu-icon grid h-9 w-9 place-items-center rounded-xl bg-[#fdeceb] text-[#c8322a]">
                  <LifeBuoy className="h-5 w-5" />
                </span>
                {humanLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          className="ih-chat-muted ih-chat-plus ih-icon-btn mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full"
          data-open={menu ? 'true' : 'false'}
          aria-label={attachLabel}
          onClick={() => {
            setMenu((value) => !value)
            setEmoji(false)
          }}
        >
          <Plus className="h-6 w-6" />
        </button>
        <div className="ih-chat-input flex min-w-0 flex-1 items-end rounded-[22px] px-3 py-2.5">
          <textarea
            ref={field}
            rows={1}
            value={body}
            placeholder={placeholder}
            enterKeyHint="send"
            className="max-h-32 min-h-6 w-full resize-none bg-transparent text-[15px] leading-5 outline-none"
            onChange={(event) => grow(event.target.value)}
            onKeyDown={onKey}
          />
          <button
            type="button"
            className={cn('ih-chat-muted ih-emoji-toggle ms-1 grid h-7 w-7 shrink-0 place-items-center', emoji && 'is-on')}
            aria-label={t('chat.emoji')}
            aria-pressed={emoji}
            onClick={() => {
              setEmoji((value) => !value)
              setMenu(false)
            }}
          >
            <Smile className="h-5 w-5" />
          </button>
        </div>
        <button
          type="submit"
          className="ih-send mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full"
          data-ready={ready ? 'true' : 'false'}
          aria-label={sendLabel}
          disabled={!ready}
        >
          <SendHorizontal className="h-5 w-5 rtl:scale-x-[-1]" />
        </button>
        <input
          ref={gallery}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            onPick(event.target.files?.[0] ?? null)
            event.target.value = ''
          }}
        />
        <input
          ref={camera}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            onPick(event.target.files?.[0] ?? null)
            event.target.value = ''
          }}
        />
      </form>
      <p className="ih-enter-hint ih-chat-muted hidden px-4 pb-1.5 text-[11px] md:block">{t('chat.enterHint')}</p>
      {zoom != null && zoom >= 0 ? <ImageLightbox images={photos} start={zoom} onClose={() => setZoom(null)} /> : null}
    </div>
  )
}
