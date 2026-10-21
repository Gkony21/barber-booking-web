import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { BarbersPage } from './pages/BarbersPage'
import { BookingPage } from './pages/BookingPage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { MyAppointmentsPage } from './pages/MyAppointmentsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

// Pages most visitors never open load on demand, so customers download less on a phone.
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })))
const AdminBarbersPage = lazy(() => import('./pages/admin/AdminBarbersPage').then((m) => ({ default: m.AdminBarbersPage })))
const BarberHoursPage = lazy(() => import('./pages/barber/BarberHoursPage').then((m) => ({ default: m.BarberHoursPage })))
const BarberProfilePage = lazy(() => import('./pages/barber/BarberProfilePage').then((m) => ({ default: m.BarberProfilePage })))
const BarberSchedulePage = lazy(() => import('./pages/barber/BarberSchedulePage').then((m) => ({ default: m.BarberSchedulePage })))
const BarberServicesPage = lazy(() => import('./pages/barber/BarberServicesPage').then((m) => ({ default: m.BarberServicesPage })))
const TermsPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.PrivacyPage })))

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="barbers/:id" element={<BookingPage />} />
        <Route
          path="appointments"
          element={
            <RequireAuth>
              <MyAppointmentsPage />
            </RequireAuth>
          }
        />
        <Route path="barber" element={<RequireAuth role="BARBER"><BarberSchedulePage /></RequireAuth>} />
        <Route path="barber/services" element={<RequireAuth role="BARBER"><BarberServicesPage /></RequireAuth>} />
        <Route path="barber/hours" element={<RequireAuth role="BARBER"><BarberHoursPage /></RequireAuth>} />
        <Route path="barber/profile" element={<RequireAuth role="BARBER"><BarberProfilePage /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth role="ADMIN"><AdminBarbersPage /></RequireAuth>} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="check-email" element={<CheckEmailPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        {/* A barber's short link, e.g. /giorgos; fixed paths above always win. */}
        <Route path=":slug" element={<BookingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

/** Barbers land on their schedule, admins on approvals; everyone else on the barber list. */
function Home() {
  const { session } = useAuth()
  if (session?.role === 'BARBER') return <Navigate to="/barber" replace />
  if (session?.role === 'ADMIN') return <Navigate to="/admin" replace />
  return <BarbersPage />
}
