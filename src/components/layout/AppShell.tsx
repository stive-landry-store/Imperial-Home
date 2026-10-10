import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppTabBar } from './AppTabBar'
import { InstallPrompt } from './InstallPrompt'
import { OfflineBanner } from './OfflineBanner'
import { PullToRefresh } from './PullToRefresh'
import { SwipeBack } from './SwipeBack'
import { installGlobalHaptics } from '../../lib/haptics'

export function AppShell() {
  const { pathname } = useLocation()
  const needsRoom = pathname.includes('/fiche')
  useEffect(() => installGlobalHaptics(), [])
  return (
    <div className={needsRoom ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : undefined}>
      <Outlet />
      <AppTabBar />
      <OfflineBanner />
      <InstallPrompt />
      <PullToRefresh />
      <SwipeBack />
    </div>
  )
}
