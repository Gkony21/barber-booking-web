import { createContext, useContext } from 'react'
import type { Session } from './session'

export interface AuthContextValue {
  session: Session | null
  login: (email: string, password: string) => Promise<Session>
  logout: () => void
  /** Keeps this device signed in with a new token, e.g. after changing the password. */
  replaceToken: (token: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
