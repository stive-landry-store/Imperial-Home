import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { ChatLine, type ChatSender } from '../../components/chat/ChatLine'
import { useAuth } from '../../hooks/useAuth'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import type { Message } from '../../types/database'

export function ChatPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: config } = useSiteConfig()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [senders, setSenders] = useState<ChatSender[]>([])
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase
    let cancelled = false
    async function boot() {
      const { data: existing } = await client
        .from('conversations')
        .select('id')
        .eq('customer_id', user!.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      let id = existing?.id as string | undefined
      if (!id) {
        const { data: created } = await client.from('conversations').insert({ customer_id: user!.id }).select('id').single()
        id = created?.id
      }
      if (!id || cancelled) return
      setConversationId(id)
      const [{ data: rows }, { data: people }] = await Promise.all([
        client.from('messages').select('*, message_attachments(*)').eq('conversation_id', id).order('created_at'),
        client.rpc('conversation_senders', { p_conversation_id: id }),
      ])
      if (!cancelled) {
        setMessages((rows as Message[]) ?? [])
        setSenders((people as ChatSender[]) ?? [])
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!supabase || !conversationId) return
    const client = supabase
    const channel = client
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          void client
            .from('messages')
            .select('*, message_attachments(*)')
            .eq('conversation_id', conversationId)
            .order('created_at')
            .then(({ data }) => setMessages((data as Message[]) ?? []))
          void client.rpc('conversation_senders', { p_conversation_id: conversationId }).then(({ data }) => setSenders((data as ChatSender[]) ?? []))
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !conversationId || !user || (!body.trim() && !file)) return
    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, role: 'customer', body: body.trim() })
      .select('id')
      .single()
    if (file && msg) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
        setFile(null)
        return
      }
      const path = `${user.id}/${conversationId}/${msg.id}-${file.name}`
      await supabase.storage.from('chat-attachments').upload(path, file)
      await supabase.from('message_attachments').insert({
        message_id: msg.id,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      })
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation_id: conversationId, message: body }),
    }).catch(() => undefined)
    setBody('')
    setFile(null)
  }

  async function requestHuman() {
    if (!supabase || !conversationId) return
    await supabase.from('conversations').update({ needs_human: true }).eq('id', conversationId)
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: null,
        role: 'system',
        body: t('chat.handed'),
        created_at: new Date().toISOString(),
      },
    ])
  }

  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="font-display text-4xl">{t('chat.title')}</h1>
        <p className="mt-4 text-muted">{t('chat.offline')}</p>
        <Button className="mt-6" onClick={() => window.open(whatsappUrl(config?.whatsapp ?? '237674092263'), '_blank')}>
          WhatsApp
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <Helmet>
        <title>{t('chat.title')} | Imperial Home</title>
      </Helmet>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-4xl">{t('chat.title')}</h1>
        <Button variant="outline" className="min-h-12 w-full sm:w-auto" onClick={() => void requestHuman()}>
          {t('chat.human')}
        </Button>
      </div>
      <div className="theme-card mt-6 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <ChatLine key={m.id} message={m} senders={senders} />
        ))}
        <div ref={bottom} />
      </div>
      <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void send(e)}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('chat.placeholder')} rows={3} />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="max-w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit" className="min-h-12 w-full">
          {t('chat.send')}
        </Button>
      </form>
    </div>
  )
}
