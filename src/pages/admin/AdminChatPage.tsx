import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { ChatLine, type ChatSender } from '../../components/chat/ChatLine'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import type { Conversation, Message } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'

type Row = Conversation & { guest?: string }

export function AdminChatPage() {
  const { t } = useTranslation()
  const { user, profile, admin } = useAuth()
  const [params] = useSearchParams()
  const [conversations, setConversations] = useState<Row[]>([])
  const [active, setActive] = useState<string | null>(params.get('c'))
  const [messages, setMessages] = useState<Message[]>([])
  const [senders, setSenders] = useState<ChatSender[]>([])
  const [body, setBody] = useState('')

  useEffect(() => {
    const id = params.get('c')
    if (id) setActive(id)
  }, [params])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    void client
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .then(async ({ data }) => {
        const rows = (data as Conversation[]) ?? []
        const ids = [...new Set(rows.map((row) => row.customer_id))]
        const { data: people } = ids.length
          ? await client.from('profiles').select('id, full_name, email').in('id', ids)
          : { data: [] }
        const names = new Map((people ?? []).map((person) => [person.id, person.full_name || person.email || person.id.slice(0, 8)]))
        setConversations(rows.map((row) => ({ ...row, guest: names.get(row.customer_id) })))
      })
  }, [active])

  useEffect(() => {
    if (!supabase || !active) return
    const client = supabase
    let cancelled = false
    async function load() {
      const [{ data: rows }, { data: people }] = await Promise.all([
        client.from('messages').select('*').eq('conversation_id', active).order('created_at'),
        client.rpc('conversation_senders', { p_conversation_id: active }),
      ])
      if (cancelled) return
      setMessages((rows as Message[]) ?? [])
      setSenders((people as ChatSender[]) ?? [])
    }
    void load()
    const channel = client
      .channel(`admin-chat-${active}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [active])

  async function send() {
    if (!supabase || !active || !body.trim() || !user) return
    const text = body.trim()
    setBody('')
    await supabase.from('messages').insert({
      conversation_id: active,
      sender_id: user.id,
      role: 'admin',
      body: text,
    })
  }

  const current = conversations.find((item) => item.id === active)

  return (
    <div className="md:grid md:min-h-[80vh] md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <Helmet>
        <title>{t('admin.chat')} | Impérial Home</title>
      </Helmet>
      <aside className={active ? 'hidden border-r border-line md:block' : 'block'}>
        <h1 className="px-4 py-5 font-display text-3xl">{t('admin.chat')}</h1>
        {conversations.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`block min-h-14 w-full px-4 py-3 text-left text-base touch-manipulation ${active === item.id ? 'bg-[#d4af6a]/15' : ''}`}
          >
            <span className="block truncate">{item.guest || item.id.slice(0, 8)}</span>
            {item.needs_human ? <span className="text-[#d4af6a]">●</span> : null}
          </button>
        ))}
      </aside>
      <div className={active ? 'flex min-h-[70vh] min-w-0 flex-col p-4' : 'hidden md:flex md:flex-col md:p-4'}>
        {active ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" className="min-h-11 px-2 text-sm uppercase tracking-wider md:hidden" onClick={() => setActive(null)}>
                {t('common.back')}
              </button>
              <p className="min-w-0 flex-1 truncate font-display text-2xl">{current?.guest}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {messages.map((message) => (
                <ChatLine key={message.id} message={message} senders={senders} />
              ))}
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <span className="truncate">{profile?.full_name || profile?.email}</span>
              {admin?.is_verified ? <VerifiedBadge title={t('admin.verified')} /> : null}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <Textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
              <Button className="min-h-12 w-full" onClick={() => void send()}>
                {t('chat.send')}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
