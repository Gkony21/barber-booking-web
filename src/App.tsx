import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { BarbersPage } from './pages/BarbersPage'
import { BookingPage } from './pages/BookingPage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { LoginPage } from './pages/LoginPage'
import { MyAppointmentsPage } from './pages/MyAppointmentsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { AdminBarbersPage } from './pages/admin/AdminBarbersPage'
import { BarberHoursPage } from './pages/barber/BarberHoursPage'
import { BarberProfilePage } from './pages/barber/BarberProfilePage'
import { BarberSchedulePage } from './pages/barber/BarberSchedulePage'
import { BarberServicesPage } from './pages/barber/BarberServicesPage'

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
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="check-email" element={<CheckEmailPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
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
