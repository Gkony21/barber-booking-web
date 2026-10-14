const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

/** An error response from the API (RFC 7807 problem details). */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors?: Record<string, string>

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

/** The server could not be reached at all. */
export class NetworkError extends Error {
  constructor() {
    super('Network error')
    this.name = 'NetworkError'
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/** Called when the API answers 401 to an authenticated request (expired or revoked token). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

/** Full address of an image the API returns as a path like "/media/abc.jpg". */
export function mediaUrl(path: string): string {
  return path.startsWith('http') ? path : API_URL + path
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const isForm = options.body instanceof FormData
  // The browser sets the multipart boundary itself for FormData.
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? 'GET',
      headers,
      body: isForm ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new NetworkError()
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    if (response.status === 401 && authToken) onUnauthorized?.()
    const fieldErrors = problem.errors && !Array.isArray(problem.errors) ? problem.errors : undefined
    throw new ApiError(response.status, problem.detail ?? response.statusText, problem.code, fieldErrors)
  }

  if (response.status === 204 || response.status === 202) return undefined as T
  return (await response.json()) as T
}
