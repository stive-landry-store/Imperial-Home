import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { ChatInbox, type InboxRow } from '../../components/chat/ChatInbox'
import { ChatThread, type Bubble } from '../../components/chat/ChatThread'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useSiteConfig } from '../../hooks/useSite'
import { chatSeen, markChatSeen, visibleMessage } from '../../lib/chatText'
import { sendChatMessage, signedAttachmentUrls } from '../../lib/chatSend'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { whatsappUrl } from '../../lib/whatsapp'
import type { Conversation, Message } from '../../types/database'
import { cn } from '../../lib/cn'

type Recent = Pick<Message, 'id' | 'conversation_id' | 'body' | 'role' | 'created_at'> & {
  message_attachments?: { id: string }[]
}

const opening = new Map<string, Promise<void>>()

export function ChatPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { data: config } = useSiteConfig()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [messages, setMessages] = useState<Bubble[]>([])
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [seenTick, setSeenTick] = useState(0)
  const phone = config?.phone || config?.whatsapp || '237674092263'

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase
    let cancelled = false
    async function load(createIfMissing: boolean) {
      const query = () =>
        client
          .from('conversations')
          .select('*')
          .eq('customer_id', user!.id)
          .order('last_message_at', { ascending: false, nullsFirst: false })
      let rows = ((await query()).data as Conversation[]) ?? []
      if (createIfMissing && !rows.some((row) => row.status === 'open')) {
        let job = opening.get(user!.id)
        if (!job) {
          job = client
            .from('conversations')
            .insert({ customer_id: user!.id })
            .then(() => undefined)
          opening.set(user!.id, job)
        }
        try {
          await job
        } finally {
          opening.delete(user!.id)
        }
        rows = ((await query()).data as Conversation[]) ?? []
      }
      if (cancelled) return
      setConversations(rows)
      const ids = rows.map((row) => row.id)
      if (!ids.length) {
        setRecent([])
        return
      }
      const { data: notes } = await client
        .from('messages')
        .select('id, conversation_id, body, role, created_at, message_attachments(id)')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(400)
      if (!cancelled) setRecent((notes as Recent[]) ?? [])
    }
    void load(true)
    const channel = client
      .channel(`inbox-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void load(false))
      .subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    if (!supabase || !active) return
    const client = supabase
    let cancelled = false
    async function loadThread() {
      const { data } = await client
        .from('messages')
        .select('*, message_attachments(*)')
        .eq('conversation_id', active)
        .order('created_at')
      const rows = (data as Message[]) ?? []
      const urls = await signedAttachmentUrls(rows.flatMap((row) => row.message_attachments?.map((item) => item.storage_path) ?? []))
      if (cancelled || !active) return
      markChatSeen(active)
      setSeenTick((value) => value + 1)
      setMessages(
        rows.map((row) => ({
          id: row.id,
          body: visibleMessage(row.body, t),
          at: row.created_at,
          mine: row.role === 'customer',
          system: row.role === 'system',
          imageUrl: urls.get(row.message_attachments?.[0]?.storage_path ?? ''),
        })),
      )
    }
    markChatSeen(active)
    setSeenTick((value) => value + 1)
    void loadThread()
    const channel = client
      .channel(`chat-${active}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active}` }, () => void loadThread())
      .subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [active, t])

  async function send() {
    if (!user || !active) return
    const current = body
    const currentFile = file
    setBody('')
    setFile(null)
    const error = await sendChatMessage({
      conversationId: active,
      senderId: user.id,
      role: 'customer',
      body: current,
      file: currentFile,
    })
    if (error) {
      setBody(current)
      setFile(currentFile)
      return
    }
    if (supabase && current.trim()) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`
      void fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation_id: active, message: current }),
      }).catch(() => undefined)
    }
  }

  async function requestHuman() {
    if (!supabase || !active) return
    await supabase.from('conversations').update({ needs_human: true }).eq('id', active)
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        body: t('chat.handed'),
        at: new Date().toISOString(),
        mine: false,
        system: true,
      },
    ])
  }

  const rows = useMemo(() => {
    const list = conversations.filter((item) => (archived ? item.status === 'closed' || item.status === 'archived' : item.status !== 'closed' && item.status !== 'archived'))
    return list.map((item) => {
      const last = recent.find((note) => note.conversation_id === item.id)
      const seen = chatSeen(item.id)
      const unread = recent.filter(
        (note) => note.conversation_id === item.id && note.role !== 'customer' && note.role !== 'system' && note.created_at > seen,
      ).length
      const photo = Boolean(last?.message_attachments?.length)
      const preview = last ? visibleMessage(last.body, t).trim() : ''
      const row: InboxRow = {
        id: item.id,
        title: 'Impérial Home',
        preview: preview || (photo ? t('chat.photo') : t('chat.emptyPreview')),
        at: last?.created_at || item.last_message_at || item.created_at,
        mark: true,
        unread,
        ring: true,
        photo: photo && !preview,
      }
      return row
    })
  }, [archived, conversations, recent, seenTick, t])

  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 pt-28">
        <h1 className="font-display text-4xl">{t('chat.discussions')}</h1>
        <p className="mt-4 text-muted">{t('chat.offline')}</p>
        <Button className="mt-6" onClick={() => window.open(whatsappUrl(phone), '_blank')}>
          WhatsApp
        </Button>
      </div>
    )
  }

  return (
    <div className="ih-chat flex h-full min-h-0 bg-[#0b0b0c]">
      <Helmet>
        <title>{t('chat.discussions')} | Impérial Home</title>
      </Helmet>
      <aside className={cn('h-full min-h-0 w-full md:w-[360px] md:shrink-0 md:border-r md:border-[#d4af6a]/25', active && 'hidden md:block')}>
        <ChatInbox
          title={t('chat.discussions')}
          rows={rows}
          activeId={active}
          archived={archived}
          archivedLabel={t('chat.archived')}
          archivedEmpty={t('chat.archivedEmpty')}
          locale={i18n.language}
          photoLabel={t('chat.photo')}
          onArchived={() => setArchived((value) => !value)}
          onOpen={setActive}
        />
      </aside>
      <section className={cn('h-full min-h-0 min-w-0 flex-1', !active && 'hidden md:block')}>
        {active ? (
          <ChatThread
            title="Impérial Home"
            subtitle={t('chat.reception')}
            mark
            phone={phone}
            messages={messages}
            locale={i18n.language}
            body={body}
            file={file}
            placeholder={t('chat.compose')}
            sendLabel={t('chat.send')}
            callLabel={t('chat.call')}
            whatsappLabel={t('chat.whatsapp')}
            cameraLabel={t('chat.camera')}
            attachLabel={t('chat.attach')}
            humanLabel={t('chat.human')}
            backLabel={t('common.back')}
            onBody={setBody}
            onSend={() => void send()}
            onBack={() => setActive(null)}
            onPick={setFile}
            onHuman={() => void requestHuman()}
          />
        ) : (
          <div className="ih-chat-wall hidden h-full place-items-center px-8 text-center text-[#d4af6a] md:grid">
            <p>{t('chat.emptyPick')}</p>
          </div>
        )}
      </section>
    </div>
  )
}
