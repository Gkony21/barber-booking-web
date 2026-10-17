import { describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { ApiError, NetworkError } from '../api/client'
import { errorMessage } from './errors'

const t = i18n.t.bind(i18n)

describe('errorMessage', () => {
  it('shows the Greek text for a known code', () => {
    expect(errorMessage(new ApiError(409, 'You can have up to 2 upcoming appointments', 'BOOKING_LIMIT'), t)).toBe(
      'Μπορείς να έχεις έως 2 ραντεβού μπροστά σου. Μόλις περάσει ή ακυρωθεί ένα, κλείνεις καινούργιο.',
    )
  })

  // The API's detail is English and meant for developers; it must never reach the screen.
  it('never shows the English detail, even for unknown codes', () => {
    const cases = [
      new ApiError(400, 'Something new went wrong', 'SOMETHING_NEW'),
      new ApiError(400, 'Validation failed'),
      new ApiError(404, 'Barber not found'),
      new ApiError(403, 'Forbidden'),
      new ApiError(409, 'Conflict'),
      new ApiError(500, 'Internal Server Error'),
    ]
    for (const error of cases) {
      const message = errorMessage(error, t)
      expect(message).not.toContain(error.message)
      expect(message).toMatch(/[α-ω]/)
    }
  })

  it('explains connection problems and too many attempts', () => {
    expect(errorMessage(new NetworkError(), t)).toBe('Δεν υπάρχει σύνδεση με τον server.')
    expect(errorMessage(new ApiError(429, 'Too many attempts'), t)).toContain('Πολλές προσπάθειες')
  })
})
