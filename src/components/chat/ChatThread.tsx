import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, Camera, Plus, SendHorizontal } from 'lucide-react'
import { chatDay } from '../../lib/chatText'
import { cn } from '../../lib/cn'

export type Bubble = {
  id: string
  body: string
  at: string
  mine: boolean
  system: boolean
  imageUrl?: string
}

function sameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10)
}

export function ChatThread({
  title,
  subtitle,
  avatarUrl,
  mark,
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
  const bottom = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState(false)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    document.documentElement.classList.add('ih-thread-open')
    return () => document.documentElement.classList.remove('ih-thread-open')
  }, [])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, file])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!body.trim() && !file) return
    onSend()
    if (field.current) field.current.style.height = 'auto'
  }

  function grow(value: string) {
    onBody(value)
    const node = field.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const ready = Boolean(body.trim() || file)

  return (
    <div className="ih-thread ih-chat-skin flex h-full min-h-0 flex-col">
      <header className="ih-thread-head ih-chat-head flex h-[64px] shrink-0 items-center gap-1 px-1">
        <button type="button" className="grid h-10 w-10 place-items-center md:hidden" aria-label={backLabel} onClick={onBack}>
          <ArrowLeft className="h-6 w-6 rtl:scale-x-[-1]" />
        </button>
        <span className="ih-chat-avatar grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full">
          {mark ? (
            <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="h-6 w-6 object-contain" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-white">{title.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[16px] leading-tight font-semibold">{title}</p>
          <p className="ih-chat-status truncate text-[12.5px]">{subtitle}</p>
        </div>
      </header>
      <div className="ih-chat-wall min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {messages.map((item, index) => {
          const previous = messages[index - 1]
          const showDay = !previous || !sameDay(previous.at, item.at)
          return (
            <div key={item.id}>
              {showDay ? (
                <p className="ih-chat-day mx-auto my-3 w-fit rounded-full px-3 py-1 text-[12px]">{chatDay(item.at, locale)}</p>
              ) : null}
              {item.system ? (
                <p className="ih-chat-system mx-auto my-2 max-w-[88%] text-center text-[12.5px]">{item.body}</p>
              ) : (
                <div
                  className={cn('ih-bubble-row mb-1 flex', item.mine ? 'justify-end' : 'justify-start')}
                  style={{ ['--ih-b' as string]: Math.max(0, Math.min(8, index - (messages.length - 9))) }}
                >
                  <div
                    className={cn(
                      'ih-bubble max-w-[82%] rounded-[18px] px-3 pt-1.5 pb-1.5',
                      item.mine ? 'ih-bubble-mine rounded-ee-[5px]' : 'ih-bubble-theirs rounded-es-[5px]',
                    )}
                  >
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="mb-1 max-h-56 rounded-2xl object-cover" /> : null}
                    {item.body.trim() ? <span className="whitespace-pre-wrap text-[14.5px] leading-[19px]">{item.body}</span> : null}
                    <span
                      className={cn(
                        'float-right mt-1 ms-3 inline-flex translate-y-0.5 text-[11px] leading-none',
                        'ih-bubble-time',
                      )}
                    >
                      {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(item.at))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      {preview ? (
        <div className="ih-chat-bar ih-pop flex items-center gap-3 px-3 pt-2">
          <img src={preview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          <button type="button" className="ih-chat-muted text-lg" onClick={() => onPick(null)}>
            ×
          </button>
        </div>
      ) : null}
      {quickReplies?.length && onQuick ? (
        <div className="ih-chat-bar flex gap-2 overflow-x-auto px-3 py-2">
          {quickReplies.map((text) => (
            <button
              key={text}
              type="button"
              className="ih-chip shrink-0 rounded-full px-3 py-1.5 text-left text-[13px]"
              onClick={() => onQuick(text)}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
      <form className="ih-thread-form ih-chat-bar relative flex items-end gap-1.5 px-2 py-2" onSubmit={submit}>
        {menu ? (
          <div className="ih-chat-menu ih-sheet absolute bottom-16 start-2 z-10 w-56 overflow-hidden rounded-2xl py-1">
            <button
              type="button"
              className="block min-h-11 w-full px-4 text-left text-[15px]"
              onClick={() => {
                setMenu(false)
                gallery.current?.click()
              }}
            >
              {cameraLabel}
            </button>
            {onHuman && humanLabel ? (
              <button
                type="button"
                className="block min-h-11 w-full px-4 text-left text-[15px]"
                onClick={() => {
                  setMenu(false)
                  onHuman()
                }}
              >
                {humanLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        <button type="button" className="ih-chat-muted ih-chat-plus mb-1 grid h-10 w-10 place-items-center" data-open={menu ? 'true' : 'false'} aria-label={attachLabel} onClick={() => setMenu((value) => !value)}>
          <Plus className="h-6 w-6" />
        </button>
        <div className="ih-chat-input flex min-w-0 flex-1 items-end rounded-3xl px-3 py-2">
          <textarea
            ref={field}
            rows={1}
            value={body}
            placeholder={placeholder}
            enterKeyHint="send"
            className="max-h-28 min-h-6 w-full resize-none bg-transparent text-[15px] leading-5 outline-none"
            onChange={(event) => grow(event.target.value)}
            onKeyDown={onKey}
          />
          <button type="button" className="ih-chat-muted ms-1 grid h-7 w-7 place-items-center" aria-label={cameraLabel} onClick={() => camera.current?.click()}>
            <Camera className="h-5 w-5" />
          </button>
        </div>
        <button
          type="submit"
          className="ih-send mb-0.5 grid h-11 w-11 place-items-center rounded-full"
          data-ready={ready ? 'true' : 'false'}
          aria-label={sendLabel}
          disabled={!ready}
        >
          <SendHorizontal className="h-5 w-5" />
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
    </div>
  )
}
