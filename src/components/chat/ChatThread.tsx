import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, Camera, CheckCheck, Phone, Plus, Send, Video } from 'lucide-react'
import { chatDay } from '../../lib/chatText'
import { whatsappUrl } from '../../lib/whatsapp'
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
  phone,
  messages,
  locale,
  body,
  file,
  placeholder,
  sendLabel,
  callLabel,
  whatsappLabel,
  cameraLabel,
  attachLabel,
  humanLabel,
  backLabel,
  onBody,
  onSend,
  onBack,
  onPick,
  onHuman,
}: {
  title: string
  subtitle: string
  avatarUrl?: string | null
  mark?: boolean
  phone?: string | null
  messages: Bubble[]
  locale: string
  body: string
  file: File | null
  placeholder: string
  sendLabel: string
  callLabel: string
  whatsappLabel: string
  cameraLabel: string
  attachLabel: string
  humanLabel?: string
  backLabel: string
  onBody: (value: string) => void
  onSend: () => void
  onBack: () => void
  onPick: (file: File | null) => void
  onHuman?: () => void
}) {
  const bottom = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, file])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

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
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-1 bg-[#f0f2f5] px-1">
        <button type="button" className="grid h-10 w-10 place-items-center md:hidden" aria-label={backLabel} onClick={onBack}>
          <ArrowLeft className="h-6 w-6 rtl:scale-x-[-1]" />
        </button>
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#111] ring-2 ring-[#25d366]">
          {mark ? (
            <img src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`} alt="" className="h-6 w-6 object-contain" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-white">{title.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[16px] leading-tight font-medium">{title}</p>
          <p className="truncate text-[12.5px] text-[#667781]">{subtitle}</p>
        </div>
        {phone ? (
          <>
            <a className="grid h-10 w-10 place-items-center text-[#111b21]" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={callLabel}>
              <Phone className="h-5 w-5" />
            </a>
            <a
              className="grid h-10 w-10 place-items-center text-[#111b21]"
              href={whatsappUrl(phone)}
              target="_blank"
              rel="noreferrer"
              aria-label={whatsappLabel}
            >
              <Video className="h-5 w-5" />
            </a>
          </>
        ) : null}
      </header>
      <div className="ih-chat-wall min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {messages.map((item, index) => {
          const previous = messages[index - 1]
          const showDay = !previous || !sameDay(previous.at, item.at)
          return (
            <div key={item.id}>
              {showDay ? (
                <p className="mx-auto my-2 w-fit rounded-lg bg-[#ffffff]/90 px-3 py-1 text-[12.5px] text-[#54656f] shadow-sm">{chatDay(item.at, locale)}</p>
              ) : null}
              {item.system ? (
                <p className="mx-auto my-2 max-w-[88%] rounded-lg bg-[#ffffff]/90 px-3 py-1.5 text-center text-[12.5px] text-[#54656f] shadow-sm">{item.body}</p>
              ) : (
                <div className={cn('mb-1 flex', item.mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[82%] rounded-lg px-2 pt-1 pb-1 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
                      item.mine ? 'rounded-ee-[4px] bg-[#d9fdd3]' : 'rounded-es-[4px] bg-[#ffffff]',
                    )}
                  >
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="mb-1 max-h-56 rounded-md object-cover" /> : null}
                    {item.body.trim() ? <span className="whitespace-pre-wrap text-[14.5px] leading-[19px]">{item.body}</span> : null}
                    <span className="float-right mt-1 ms-3 inline-flex translate-y-0.5 items-center gap-0.5 text-[11px] leading-none text-[#667781]">
                      {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(item.at))}
                      {item.mine ? <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" /> : null}
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
        <div className="flex items-center gap-3 bg-[#f0f2f5] px-3 pt-2">
          <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
          <button type="button" className="text-sm text-[#667781]" onClick={() => onPick(null)}>
            ×
          </button>
        </div>
      ) : null}
      <form className="relative flex items-end gap-1.5 bg-[#f0f2f5] px-2 py-2" onSubmit={submit}>
        {menu ? (
          <div className="absolute bottom-16 start-2 z-10 w-56 overflow-hidden rounded-xl bg-[#ffffff] py-1 shadow-lg">
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
        <button type="button" className="mb-1 grid h-10 w-10 place-items-center text-[#54656f]" aria-label={attachLabel} onClick={() => setMenu((value) => !value)}>
          <Plus className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-end rounded-3xl bg-[#ffffff] px-3 py-2">
          <textarea
            ref={field}
            rows={1}
            value={body}
            placeholder={placeholder}
            enterKeyHint="send"
            className="max-h-28 min-h-6 w-full resize-none bg-transparent text-[15px] leading-5 text-[#111b21] outline-none placeholder:text-[#8696a0]"
            onChange={(event) => grow(event.target.value)}
            onKeyDown={onKey}
          />
          <button type="button" className="ms-1 grid h-7 w-7 place-items-center text-[#54656f]" aria-label={cameraLabel} onClick={() => camera.current?.click()}>
            <Camera className="h-5 w-5" />
          </button>
        </div>
        <button
          type="submit"
          className="mb-0.5 grid h-11 w-11 place-items-center rounded-full bg-[#25d366] text-white disabled:opacity-40"
          aria-label={sendLabel}
          disabled={!ready}
        >
          <Send className="h-5 w-5" />
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
