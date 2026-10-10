import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChatInbox, type InboxRow } from '../../components/chat/ChatInbox'
import { ChatThread, type Bubble } from '../../components/chat/ChatThread'
import { useAuth } from '../../hooks/useAuth'
import { chatSeen, markChatSeen, visibleMessage } from '../../lib/chatText'
import { sendChatMessage, signedAttachmentUrls } from '../../lib/chatSend'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/cn'
import type { Conversation, Message } from '../../types/database'

type Person = { id: string; full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null }
type Row = Conversation & { person?: Person }
type Recent = Pick<Message, 'id' | 'conversation_id' | 'body' | 'role' | 'created_at'> & {
  message_attachments?: { id: string }[]
}

export function AdminChatPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [conversations, setConversations] = useState<Row[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [active, setActive] = useState<string | null>(params.get('c'))
  const [archived, setArchived] = useState(false)
  const [messages, setMessages] = useState<Bubble[]>([])
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [seenTick, setSeenTick] = useState(0)

  useEffect(() => {
    const id = params.get('c')
    if (id) setActive(id)
  }, [params])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let cancelled = false
    async function load() {
      const { data } = await client.from('conversations').select('*').order('last_message_at', { ascending: false, nullsFirst: false })
      const rows = (data as Conversation[]) ?? []
      const ids = [...new Set(rows.map((row) => row.customer_id))]
      const { data: people } = ids.length
        ? await client.from('profiles').select('id, full_name, email, phone, avatar_url').in('id', ids)
        : { data: [] as Person[] }
      const byId = new Map(((people as Person[]) ?? []).map((person) => [person.id, person]))
      if (cancelled) return
      setConversations(rows.map((row) => ({ ...row, person: byId.get(row.customer_id) })))
      if (!rows.length) {
        setRecent([])
        return
      }
      const { data: notes } = await client
        .from('messages')
        .select('id, conversation_id, body, role, created_at, message_attachments(id)')
        .in(
          'conversation_id',
          rows.map((row) => row.id),
        )
        .order('created_at', { ascending: false })
        .limit(500)
      if (!cancelled) setRecent((notes as Recent[]) ?? [])
    }
    void load()
    const channel = client
      .channel('admin-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void load())
      .subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!supabase || !active) return
    const client = supabase
    let cancelled = false
    async function loadThread() {
      const { data } = await client.from('messages').select('*, message_attachments(*)').eq('conversation_id', active).order('created_at')
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
          mine: row.role === 'admin',
          system: row.role === 'system',
          imageUrl: urls.get(row.message_attachments?.[0]?.storage_path ?? ''),
        })),
      )
    }
    markChatSeen(active)
    setSeenTick((value) => value + 1)
    void loadThread()
    const channel = client
      .channel(`admin-chat-${active}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active}` }, () => void loadThread())
      .subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [active, t])

  function open(id: string) {
    setActive(id)
    setParams({ c: id })
  }

  async function send() {
    if (!user || !active) return
    const current = body
    const currentFile = file
    setBody('')
    setFile(null)
    const error = await sendChatMessage({
      conversationId: active,
      senderId: user.id,
      role: 'admin',
      body: current,
      file: currentFile,
    })
    if (error) {
      setBody(current)
      setFile(currentFile)
    }
  }

  const current = conversations.find((item) => item.id === active)
  const rows = useMemo(() => {
    const list = conversations
      .filter((item) => (archived ? item.status === 'closed' || item.status === 'archived' : item.status !== 'closed' && item.status !== 'archived'))
      .slice()
      .sort((a, b) => Number(b.needs_human) - Number(a.needs_human) || (b.last_message_at || b.created_at).localeCompare(a.last_message_at || a.created_at))
    return list.map((item) => {
      const last = recent.find((note) => note.conversation_id === item.id)
      const seen = chatSeen(item.id)
      const unread = recent.filter((note) => note.conversation_id === item.id && note.role === 'customer' && note.created_at > seen).length
      const photo = Boolean(last?.message_attachments?.length)
      const preview = last ? visibleMessage(last.body, t).trim() : ''
      const row: InboxRow = {
        id: item.id,
        title: item.person?.full_name || item.person?.email || t('chat.guest'),
        preview: preview || (photo ? t('chat.photo') : ''),
        at: last?.created_at || item.last_message_at || item.created_at,
        avatarUrl: item.person?.avatar_url,
        unread,
        pinned: item.needs_human,
        ring: item.needs_human || unread > 0,
        photo: photo && !preview,
      }
      return row
    })
  }, [archived, conversations, recent, seenTick, t])

  return (
    <div className="ih-chat flex h-full min-h-0 flex-1 bg-[#0b0b0c]">
      <Helmet>
        <title>{t('chat.discussions')} | Impérial Home</title>
      </Helmet>
      <aside className={cn('h-full min-h-0 w-full md:w-[340px] md:shrink-0 md:border-r md:border-[#d4af6a]/25', active && 'hidden md:block')}>
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
          onOpen={open}
        />
      </aside>
      <section className={cn('h-full min-h-0 min-w-0 flex-1', !active && 'hidden md:block')}>
        {active ? (
          <ChatThread
            title={current?.person?.full_name || current?.person?.email || t('chat.guest')}
            subtitle={current?.person?.phone || t('chat.guest')}
            avatarUrl={current?.person?.avatar_url}
            phone={current?.person?.phone}
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
            backLabel={t('common.back')}
            onBody={setBody}
            onSend={() => void send()}
            onBack={() => {
              setActive(null)
              setParams({})
            }}
            onPick={setFile}
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
