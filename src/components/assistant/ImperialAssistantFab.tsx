import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ImagePlus, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { usePublishedProperties, useSiteConfig } from '../../hooks/useSite'
import { groundedReply } from '../../lib/assistant'
import { fetchMyReservations } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { whatsappUrl } from '../../lib/whatsapp'
import { Live } from '../i18n/Live'
import { cn } from '../../lib/cn'

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
        const path = `assistant/${user?.id ?? 'guest'}/${Date.now()}-${pendingImage.name}`
        const { error } = await supabase.storage.from('property-images').upload(path, pendingImage, { upsert: true })
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
    if (!id) return
    await client.from('messages').insert({
      conversation_id: id,
      sender_id: user.id,
      role: 'customer',
      body: prompt || t('assistant.unknown'),
    })
    await client.from('conversations').update({ needs_human: true }).eq('id', id)
    setOpen(false)
    navigate('/account/chat')
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
        className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af6a]/50 bg-black text-[#d4af6a] shadow-lg touch-manipulation md:right-6"
        style={{ bottom: 'max(9.25rem, calc(env(safe-area-inset-bottom) + 8.5rem))' }}
        aria-label={t('assistant.open')}
      >
        <Bot className="h-7 w-7" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 md:p-6">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative flex h-[min(560px,85svh)] w-full max-w-md flex-col overflow-hidden border border-[#d4af6a]/35 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d4af6a]/25 px-4 py-3">
              <div>
                <p className="font-display text-lg text-[#d4af6a]">Imperial-Home Bot</p>
                <p className="text-xs text-white/60">{t('assistant.subtitle')}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-[#d4af6a]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-[90%] rounded px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user' ? 'ml-auto bg-[#d4af6a]/20 text-white' : 'bg-white/5 text-white/90',
                  )}
                >
                  {m.imageUrl ? <img src={m.imageUrl} alt="" className="mb-2 max-h-32 rounded object-cover" /> : null}
                  <p className="whitespace-pre-wrap">
                    {m.id === 'welcome' ? t('assistant.welcome') : <Live text={m.text} from={m.source ?? 'en'} />}
                  </p>
                  {m.escalate ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        className="min-h-11 bg-[#c4a35a] px-3 text-sm text-black touch-manipulation"
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
              <div className="border-t border-[#d4af6a]/20 px-4 py-2">
                <img src={preview} alt="" className="h-20 rounded object-cover" />
              </div>
            ) : null}
            <div className="flex gap-2 border-t border-[#d4af6a]/25 p-3">
              <button type="button" className="text-[#d4af6a]" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void send()}
                placeholder={t('assistant.placeholder')}
                className="min-w-0 flex-1 border border-[#d4af6a]/30 bg-transparent px-3 py-2 text-sm text-white outline-none"
              />
              <button type="button" disabled={pending} onClick={() => void send()} className="text-[#d4af6a] disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
