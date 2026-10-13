import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, NetworkError, setAuthToken, setUnauthorizedHandler } from './client'

afterEach(() => {
  setAuthToken(null)
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

function respond(status: number, body?: object) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body ? JSON.stringify(body) : null, { status })))
}

describe('api client', () => {
  it('turns problem details into an ApiError with code and field errors', async () => {
    respond(403, { status: 403, detail: 'Please verify your email', code: 'EMAIL_NOT_VERIFIED' })
    await expect(api('/auth/login')).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' })

    respond(400, { detail: 'Validation failed', errors: { password: 'too short' } })
    const error = (await api('/auth/register').catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.fieldErrors).toEqual({ password: 'too short' })
  })

  it('reports an unreachable server as a NetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(api('/barbers')).rejects.toBeInstanceOf(NetworkError)
  })

  it('sends the token and logs out when the server rejects it', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const onUnauthorized = vi.fn()
    setAuthToken('abc')
    setUnauthorizedHandler(onUnauthorized)

    await expect(api('/appointments/me')).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer abc' }) }),
    )
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
