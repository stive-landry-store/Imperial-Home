import { lazy, Suspense, useLayoutEffect, type ReactNode } from 'react'
import { Loader } from '../components/ui/Loader'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { PublicLayout } from '../components/layout/PublicLayout'
import { CustomerLayout } from '../components/layout/CustomerLayout'
import { AdminLayout } from '../components/layout/AdminLayout'
import { HomePage } from '../pages/public/HomePage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { ActivityTracker } from '../components/ActivityTracker'
import { IncomingToast } from '../components/IncomingToast'
import { HomeScreenBadge } from '../components/HomeScreenBadge'
import { PushPrompt } from '../components/PushPrompt'
import { RequireAuth, RequireStaff } from './guards'
import { AppShell } from '../components/layout/AppShell'
import { MotionDirector } from '../components/motion/MotionDirector'

// Pages load on demand: the first visit only downloads the home page and the layout.
const FavoritesPage = lazy(() => import('../pages/public/FavoritesPage').then((m) => ({ default: m.FavoritesPage })))
const PropertiesPage = lazy(() => import('../pages/public/PropertiesPage').then((m) => ({ default: m.PropertiesPage })))
const MapPage = lazy(() => import('../pages/public/MapPage').then((m) => ({ default: m.MapPage })))
const ComparePage = lazy(() => import('../pages/public/ComparePage').then((m) => ({ default: m.ComparePage })))
const PropertyDetailPage = lazy(() => import('../pages/public/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })))
const BookingPage = lazy(() => import('../pages/public/BookingPage').then((m) => ({ default: m.BookingPage })))
const ContactPage = lazy(() => import('../pages/public/ContactPage').then((m) => ({ default: m.ContactPage })))
const InstallGuidePage = lazy(() => import('../pages/public/InstallGuidePage').then((m) => ({ default: m.InstallGuidePage })))
const CarsPage = lazy(() => import('../pages/public/CarsPage').then((m) => ({ default: m.CarsPage })))
const CarDetailPage = lazy(() => import('../pages/public/CarDetailPage').then((m) => ({ default: m.CarDetailPage })))
const AuthPage = lazy(() => import('../pages/public/AuthPage').then((m) => ({ default: m.AuthPage })))
const ForgotPasswordPage = lazy(() => import('../pages/public/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../pages/public/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const AccountReservationsPage = lazy(() => import('../pages/customer/AccountReservationsPage').then((m) => ({ default: m.AccountReservationsPage })))
const ReservationDetailPage = lazy(() => import('../pages/customer/ReservationDetailPage').then((m) => ({ default: m.ReservationDetailPage })))
const ProfilePage = lazy(() => import('../pages/customer/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const ChatPage = lazy(() => import('../pages/customer/ChatPage').then((m) => ({ default: m.ChatPage })))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminTodayPage = lazy(() => import('../pages/admin/AdminTodayPage').then((m) => ({ default: m.AdminTodayPage })))
const AdminPropertiesPage = lazy(() => import('../pages/admin/AdminPropertiesPage').then((m) => ({ default: m.AdminPropertiesPage })))
const PropertyFormPage = lazy(() => import('../pages/admin/PropertyFormPage').then((m) => ({ default: m.PropertyFormPage })))
const AdminReservationsPage = lazy(() => import('../pages/admin/AdminReservationsPage').then((m) => ({ default: m.AdminReservationsPage })))
const AdminReservationDetailPage = lazy(() => import('../pages/admin/AdminReservationDetailPage').then((m) => ({ default: m.AdminReservationDetailPage })))
const AdminCalendarPage = lazy(() => import('../pages/admin/AdminCalendarPage').then((m) => ({ default: m.AdminCalendarPage })))
const AdminCustomersPage = lazy(() => import('../pages/admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage })))
const AdminPromotionsPage = lazy(() => import('../pages/admin/AdminPromotionsPage').then((m) => ({ default: m.AdminPromotionsPage })))
const AdminPaymentsPage = lazy(() => import('../pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage })))
const AdminChatPage = lazy(() => import('../pages/admin/AdminChatPage').then((m) => ({ default: m.AdminChatPage })))
const AdminAdminsPage = lazy(() => import('../pages/admin/AdminAdminsPage').then((m) => ({ default: m.AdminAdminsPage })))
const AdminActivityPage = lazy(() => import('../pages/admin/AdminActivityPage').then((m) => ({ default: m.AdminActivityPage })))
const AdminAuditPage = lazy(() => import('../pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })))
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })))
const AdminTurnoverPage = lazy(() => import('../pages/admin/AdminTurnoverPage').then((m) => ({ default: m.AdminTurnoverPage })))
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage })))
const AdminVehiclesPage = lazy(() => import('../pages/admin/AdminVehiclesPage').then((m) => ({ default: m.AdminVehiclesPage })))
const HousingSheetEditorPage = lazy(() => import('../pages/shared/HousingSheetEditorPage').then((m) => ({ default: m.HousingSheetEditorPage })))
const AdminScanPage = lazy(() => import('../pages/admin/AdminScanPage').then((m) => ({ default: m.AdminScanPage })))

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="theme-page ih-fade-in pt-28"><Loader size="lg" fill /></div>}>{children}</Suspense>
}

function routerBasename() {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.replace(/\/$/, '')
}

function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])
  return null
}

export function AppRouter() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <ScrollToTop />
      <MotionDirector />
      <ActivityTracker />
      <IncomingToast />
      <HomeScreenBadge />
      <PushPrompt />
      <Page>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/favoris" element={<FavoritesPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/map" element={<MapPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/properties/:slug" element={<PropertyDetailPage />} />
            <Route
              path="/properties/:slug/book"
              element={
                <RequireAuth>
                  <BookingPage />
                </RequireAuth>
              }
            />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/installer" element={<InstallGuidePage />} />
            <Route path="/cars" element={<CarsPage />} />
            <Route path="/cars/:slug" element={<CarDetailPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/fiche" element={<HousingSheetEditorPage role="guest" preview />} />
          <Route path="/fiche-logement" element={<HousingSheetEditorPage role="guest" preview />} />
          <Route
            path="/account/reservations/:id/fiche"
            element={
              <RequireAuth>
                <HousingSheetEditorPage role="guest" />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <CustomerLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AccountReservationsPage />} />
            <Route path="reservations/:id" element={<ReservationDetailPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireStaff>
                <AdminLayout />
              </RequireStaff>
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="today" element={<AdminTodayPage />} />
          <Route path="properties" element={<AdminPropertiesPage />} />
          <Route path="properties/:id" element={<PropertyFormPage />} />
          <Route path="reservations" element={<AdminReservationsPage />} />
          <Route path="reservations/:id" element={<AdminReservationDetailPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="vehicles" element={<AdminVehiclesPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="turnover" element={<AdminTurnoverPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="chat" element={<AdminChatPage />} />
          <Route path="scan" element={<AdminScanPage />} />
          <Route path="admins" element={<AdminAdminsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route
          path="/admin/housing-sheet"
          element={
            <RequireAuth>
              <RequireStaff>
                <HousingSheetEditorPage role="admin" />
              </RequireStaff>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/reservations/:id/fiche"
          element={
            <RequireAuth>
              <RequireStaff>
                <HousingSheetEditorPage role="admin" />
              </RequireStaff>
            </RequireAuth>
          }
        />
        <Route path="/book" element={<Navigate to="/properties" replace />} />
      </Routes>
      </Page>
    </BrowserRouter>
  )
}
