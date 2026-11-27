import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ImagePlus, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { usePublishedProperties, useSiteConfig } from '../../hooks/useSite'
import { groundedReply } from '../../lib/assistant'
import { compressPhoto } from '../../lib/compressImage'
import { fetchMyReservations } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { whatsappUrl } from '../../lib/whatsapp'
import { Live } from '../i18n/Live'
import { cn } from '../../lib/cn'
import { isoMinutesAgo } from '../../lib/time'

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  text: string
  imageUrl?: string
  escalate?: boolean
  prompt?: string
  source?: 'fr' | 'en'
}

export function ImperialAssistantFab() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const { data: config } = useSiteConfig()
  const { data: properties = [] } = usePublishedProperties()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t('assistant.welcome'),
    },
  ])
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function send() {
    const question = input.trim()
    if (!question && !pendingImage) return
    setPending(true)
    let imageUrl: string | undefined
    try {
      if (pendingImage && supabase) {
        const photo = await compressPhoto(pendingImage, 1200, 0.82)
        const path = `assistant/${user?.id ?? 'guest'}/${Date.now()}.jpg`
        const { error } = await supabase.storage.from('property-images').upload(path, photo, {
          upsert: true,
          contentType: 'image/jpeg',
        })
        if (!error) {
          imageUrl = supabase.storage.from('property-images').getPublicUrl(path).data.publicUrl
        }
      }
      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        text: question || t('assistant.imageOnly'),
        imageUrl,
      }
      setMessages((m) => [...m, userMsg])
      setInput('')
      setPendingImage(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)

      const reservations = user ? await fetchMyReservations().catch(() => []) : []
      const reply = groundedReply({
        question: imageUrl ? `${question}\n[${t('assistant.imageAttached')}]` : question,
        lang: i18n.language,
        properties,
        reservations,
        phone: config?.phone ?? '+237 674 09 22 63',
        email: config?.email ?? 'imperialhome237@gmail.com',
        isStaff,
      })
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: reply.answer,
          escalate: reply.escalate,
          prompt: question,
          source: i18n.language.startsWith('fr') ? 'fr' : 'en',
        },
      ])
    } finally {
      setPending(false)
    }
  }

  async function writeHuman(prompt: string) {
    if (!user || !supabase) {
      navigate('/login')
      return
    }
    if (sending) return
    setSending(true)
    const client = supabase
    const { data: existing } = await client
      .from('conversations')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    let id = existing?.id as string | undefined
    if (!id) {
      const { data: created } = await client.from('conversations').insert({ customer_id: user.id, needs_human: true }).select('id').single()
      id = created?.id
    }
    if (!id) {
      setSending(false)
      return
    }
    const text = prompt || t('assistant.unknown')
    const since = isoMinutesAgo(2)
    const { data: duplicate } = await client
      .from('messages')
      .select('id')
      .eq('conversation_id', id)
      .eq('role', 'customer')
      .eq('body', text)
      .gte('created_at', since)
      .limit(1)
      .maybeSingle()
    if (!duplicate) {
      await client.from('messages').insert({
        conversation_id: id,
        sender_id: user.id,
        role: 'customer',
        body: text,
      })
      await client.from('conversations').update({ needs_human: true, last_message_at: new Date().toISOString() }).eq('id', id)
    }
    setSending(false)
    setOpen(false)
    navigate('/account/chat', { state: { open: id } })
  }

  function onPick(file: File | null) {
    if (!file) return
    setPendingImage(file)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ih-fab ih-fab-bot ih-btn fixed right-4 z-50 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full text-white touch-manipulation md:right-6"
        style={{ bottom: 'max(9.75rem, calc(env(safe-area-inset-bottom) + 9rem))' }}
        aria-label={t('assistant.open')}
      >
        <Bot className="h-7 w-7" strokeWidth={2.1} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 md:p-6">
          <button type="button" className="ih-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="ih-assistant-panel relative flex h-[min(560px,85svh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-accent/35 bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-accent/25 px-4 py-3">
              <div>
                <p className="font-display text-lg text-accent">Imperial-Home Bot</p>
                <p className="text-xs text-panel-fg/60">{t('assistant.subtitle')}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-[90%] rounded px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user' ? 'ml-auto bg-accent-strong/20 text-panel-fg' : 'bg-accent-soft text-panel-fg/90',
                  )}
                >
                  {m.imageUrl ? <img src={m.imageUrl} alt="" className="mb-2 max-h-32 rounded-2xl object-cover" /> : null}
                  <p className="whitespace-pre-wrap">
                    {m.id === 'welcome' ? t('assistant.welcome') : <Live text={m.text} from={m.source ?? 'en'} />}
                  </p>
                  {m.escalate ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={sending}
                        className="min-h-11 bg-accent-strong px-3 text-sm text-on-accent touch-manipulation disabled:opacity-60"
                        onClick={() => void writeHuman(m.prompt || '')}
                      >
                        {t('assistant.writeHuman')}
                      </button>
                      <a
                        className="inline-flex min-h-11 items-center justify-center border border-[#25D366] px-3 text-sm text-[#25D366] touch-manipulation"
                        href={whatsappUrl(config?.whatsapp ?? '237674092263', m.prompt || t('assistant.unknown'))}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('assistant.whatsapp')}
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {preview ? (
              <div className="border-t border-accent/20 px-4 py-2">
                <img src={preview} alt="" className="h-20 rounded-2xl object-cover" />
              </div>
            ) : null}
            <div className="flex gap-2 border-t border-accent/25 p-3">
              <button type="button" className="text-accent" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void send()}
                placeholder={t('assistant.placeholder')}
                className="min-w-0 flex-1 border border-accent/30 bg-transparent px-3 py-2 text-sm text-panel-fg outline-none"
              />
              <button type="button" disabled={pending} onClick={() => void send()} className="text-accent disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
