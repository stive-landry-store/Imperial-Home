import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppFab } from './WhatsAppFab'
import { ImperialAssistantFab } from '../assistant/ImperialAssistantFab'
import { AssistantNotice } from './AssistantNotice'

export function PublicLayout() {
  return (
    <div className="theme-page flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </main>
      <Footer />
      <AssistantNotice />
      <ImperialAssistantFab />
      <WhatsAppFab />
    </div>
  )
}
