import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import { authApi } from '../api/endpoints'
import { AuthContext } from './AuthContext'
import { loadSession, saveSession, sessionFromToken, type Session } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(() => {
    const stored = loadSession()
    setAuthToken(stored?.token ?? null)
    return stored
  })

  const logout = useCallback(() => {
    setAuthToken(null)
    saveSession(null)
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await authApi.login(email, password)
    const next = sessionFromToken(token)
    if (!next) throw new Error('Invalid token from server')
    setAuthToken(token)
    saveSession(next)
    setSession(next)
    return next
  }, [])

  const replaceToken = useCallback((token: string) => {
    const next = sessionFromToken(token)
    if (!next) return
    setAuthToken(token)
    saveSession(next)
    setSession(next)
  }, [])

  const value = useMemo(() => ({ session, login, logout, replaceToken }), [session, login, logout, replaceToken])

  return <AuthContext value={value}>{children}</AuthContext>
}
