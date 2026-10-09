import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '../components/layout/PublicLayout'
import { CustomerLayout } from '../components/layout/CustomerLayout'
import { AdminLayout } from '../components/layout/AdminLayout'
import { HomePage } from '../pages/public/HomePage'
import { PropertiesPage } from '../pages/public/PropertiesPage'
import { MapPage } from '../pages/public/MapPage'
import { ComparePage } from '../pages/public/ComparePage'
import { PropertyDetailPage } from '../pages/public/PropertyDetailPage'
import { BookingPage } from '../pages/public/BookingPage'
import { ContactPage } from '../pages/public/ContactPage'
import { CarsPage } from '../pages/public/CarsPage'
import { CarDetailPage } from '../pages/public/CarDetailPage'
import { AuthPage } from '../pages/public/AuthPage'
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/public/ResetPasswordPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { AccountReservationsPage } from '../pages/customer/AccountReservationsPage'
import { ReservationDetailPage } from '../pages/customer/ReservationDetailPage'
import { ProfilePage } from '../pages/customer/ProfilePage'
import { ChatPage } from '../pages/customer/ChatPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminPropertiesPage } from '../pages/admin/AdminPropertiesPage'
import { PropertyFormPage } from '../pages/admin/PropertyFormPage'
import { AdminReservationsPage } from '../pages/admin/AdminReservationsPage'
import { AdminReservationDetailPage } from '../pages/admin/AdminReservationDetailPage'
import { AdminCalendarPage } from '../pages/admin/AdminCalendarPage'
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage'
import { AdminPromotionsPage } from '../pages/admin/AdminPromotionsPage'
import { AdminPaymentsPage } from '../pages/admin/AdminPaymentsPage'
import { AdminChatPage } from '../pages/admin/AdminChatPage'
import { AdminAdminsPage } from '../pages/admin/AdminAdminsPage'
import { AdminAuditPage } from '../pages/admin/AdminAuditPage'
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage'
import { AdminTurnoverPage } from '../pages/admin/AdminTurnoverPage'
import { AdminReviewsPage } from '../pages/admin/AdminReviewsPage'
import { AdminVehiclesPage } from '../pages/admin/AdminVehiclesPage'
import { HousingSheetEditorPage } from '../pages/shared/HousingSheetEditorPage'
import { RequireAuth, RequireStaff } from './guards'

function routerBasename() {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.replace(/\/$/, '')
}

export function AppRouter() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
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
          <Route path="admins" element={<AdminAdminsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
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
    </BrowserRouter>
  )
}
