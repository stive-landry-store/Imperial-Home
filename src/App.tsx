import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { AppRouter } from './app/router'
import { BrandIntro } from './components/brand/BrandIntro'
import { LanguageDock } from './components/layout/LanguageDock'
import { LiveDataSync } from './components/LiveDataSync'
import { AppLock } from './components/AppLock'
import { OfflineCache } from './components/OfflineCache'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true, refetchOnReconnect: true },
  },
})

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppLock />
            <OfflineCache />
            <LiveDataSync />
            <BrandIntro />
            <AppRouter />
            <LanguageDock />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}
