import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { App } from '../App'
import { AuthProvider } from '../auth/AuthProvider'

/** Renders the whole app at a path, with fresh query state. */
export function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

/** A token the app can decode (the signature is only checked by the server). */
export function fakeToken(email: string, role: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS512' })}.${encode({ sub: email, role, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
}

export function logInAs(email: string, role: string) {
  localStorage.setItem('fade.session', fakeToken(email, role))
}

type Handler = (body: unknown) => { status?: number; json?: unknown }

/** Stubs fetch with handlers keyed by "METHOD /path?query". Unknown requests fail the test. */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { key: string; body: unknown; headers: Record<string, string> }[] = []
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const { pathname, search } = new URL(url)
    const key = `${init.method ?? 'GET'} ${pathname}${search}`
    const body = init.body instanceof FormData ? init.body : init.body ? JSON.parse(init.body as string) : undefined
    calls.push({ key, body, headers: (init.headers ?? {}) as Record<string, string> })
    const handler = routes[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    const { status = 200, json } = handler(body)
    return new Response(json === undefined ? null : JSON.stringify(json), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}
