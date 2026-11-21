import { useState } from 'react'
import { ChatInbox } from '../../components/chat/ChatInbox'
import { ChatThread, type Bubble } from '../../components/chat/ChatThread'

const now = Date.now()
const at = (m: number) => new Date(now - m * 60_000).toISOString()
const seed: Bubble[] = [
  { id: '1', body: 'Bonjour, l’appartement Abidjan est-il libre ce week-end ?', at: at(30), mine: false, system: false },
  { id: '2', body: 'Bonjour ! Oui, du vendredi au dimanche. Je vous bloque les dates ?', at: at(28), mine: true, system: false },
  { id: '3', body: 'Paiement reçu — séjour confirmé.', at: at(20), mine: false, system: true },
  { id: '4', body: 'Parfait, merci. On arrive vers 15 h.', at: at(5), mine: false, system: false },
  { id: '5', body: 'Très bien. Votre code d’accès apparaîtra la veille dans votre espace.', at: at(1), mine: true, system: false },
]

export function MotionLab() {
  const [messages, setMessages] = useState(seed)
  const [body, setBody] = useState('')
  return (
    <div className="flex h-dvh">
      <div className="w-[340px]">
        <ChatInbox
          title="Discussions"
          rows={[
            { id: 'a', title: 'Awa Ngono', preview: 'Parfait, merci. On arrive vers 15 h.', at: at(5), unread: 2, ring: true },
            { id: 'b', title: 'Imperial Home', preview: 'Votre séjour est confirmé', at: at(90), unread: 0, mark: true, pinned: true },
            { id: 'c', title: 'Jean-Paul', preview: 'Photo', at: at(600), unread: 0, photo: true },
          ]}
          activeId="a"
          archived={false}
          archivedLabel="Archivées"
          archivedEmpty="Rien"
          locale="fr"
          photoLabel="Photo"
          onArchived={() => undefined}
          onOpen={() => undefined}
        />
      </div>
      <div className="min-w-0 flex-1">
        <ChatThread
          title="Awa Ngono"
          subtitle="En ligne"
          messages={messages}
          locale="fr"
          body={body}
          file={null}
          placeholder="Message"
          sendLabel="Envoyer"
          cameraLabel="Caméra"
          attachLabel="Joindre"
          backLabel="Retour"
          onBody={setBody}
          onSend={() => {
            setMessages((list) => [...list, { id: String(list.length + 1), body, at: new Date().toISOString(), mine: true, system: false }])
            setBody('')
          }}
          onBack={() => undefined}
          onPick={() => undefined}
          quickReplies={['L’appartement est prêt.', 'Arrivée à 14 h.']}
          onQuick={setBody}
        />
      </div>
    </div>
  )
}
