import type { Role } from '../api/types'

export interface Session {
  token: string
  email: string
  role: Role
  expiresAt: number
}

const STORAGE_KEY = 'fade.session'

/** Reads email, role and expiry from the JWT payload. The server still verifies the signature. */
export function sessionFromToken(token: string): Session | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub || !payload.role || !payload.exp) return null
    return { token, email: payload.sub, role: payload.role, expiresAt: payload.exp * 1000 }
  } catch {
    return null
  }
}

export function loadSession(): Session | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY)
    const session = token ? sessionFromToken(token) : null
    return session && session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, session.token)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage: the session simply lasts until the tab closes.
  }
}
