import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import type { Conversation, Message } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'

export function AdminChatPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!supabase) return
    void supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setConversations((data as Conversation[]) ?? []))
  }, [])

  useEffect(() => {
    if (!supabase || !active) return
    void supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', active)
      .order('created_at')
      .then(({ data }) => setMessages((data as Message[]) ?? []))
  }, [active])

  async function send() {
    if (!supabase || !active || !body.trim()) return
    await supabase.from('messages').insert({
      conversation_id: active,
      sender_id: user?.id,
      role: 'admin',
      body: body.trim(),
    })
    await supabase.from('conversations').update({ needs_human: false, assigned_admin_id: user?.id }).eq('id', active)
    setBody('')
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', active).order('created_at')
    setMessages((data as Message[]) ?? [])
  }

  return (
    <div className="grid min-h-[80vh] md:grid-cols-[280px_1fr]">
      <Helmet>
        <title>{t('admin.chat')} | Imperial Home</title>
      </Helmet>
      <aside className="surface-light border-r border-line">
        <h1 className="px-4 py-5 font-display text-2xl">{t('admin.chat')}</h1>
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`block w-full px-4 py-3 text-left text-base ${active === c.id ? 'bg-cream' : ''}`}
          >
            {c.id.slice(0, 8)}
            {c.needs_human ? <span className="ml-2 text-gold">●</span> : null}
          </button>
        ))}
      </aside>
      <div className="flex flex-col p-4">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <p key={m.id} className="text-sm">
              <span className="text-xs uppercase text-muted">{m.role}: </span>
              {m.body}
            </p>
          ))}
        </div>
        {active ? (
          <div className="mt-4 flex gap-2">
            <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button onClick={() => void send()}>{t('chat.send')}</Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
