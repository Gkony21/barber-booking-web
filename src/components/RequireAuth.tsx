import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'

/** Sends visitors to the login page, then back here after they log in; other roles go home. */
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (role && session.role !== role) {
    return <Navigate to="/" replace />
  }
  return children
}
