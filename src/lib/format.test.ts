import { describe, expect, it } from 'vitest'
import { bookableDays, formatAppointmentTime, formatPrice } from './format'

describe('bookableDays', () => {
  it('returns today plus 14 consecutive days in Athens', () => {
    const days = bookableDays(15, new Date('2026-10-13T08:00:00Z'))
    expect(days).toHaveLength(15)
    expect(days[0]).toEqual({ iso: '2026-10-13', weekday: 'Τρί', day: '13' })
    expect(days[14].iso).toBe('2026-10-27')
  })

  it('uses the Athens date late in the evening, not the UTC one', () => {
    // 23:30 UTC on the 13th is already the 14th in Athens.
    expect(bookableDays(1, new Date('2026-10-13T23:30:00Z'))[0].iso).toBe('2026-10-14')
  })

  it('never repeats or skips a day across the clock change', () => {
    const isoDays = bookableDays(5, new Date('2026-10-24T21:30:00Z')).map((d) => d.iso)
    expect(isoDays).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'])
  })
})

describe('formatting', () => {
  it('shows appointment times on a 24-hour clock in Athens time', () => {
    expect(formatAppointmentTime('2026-10-13T18:00:00+03:00')).toBe('Τρίτη 13 Οκτωβρίου στις 18:00')
  })

  it('formats prices in euro', () => {
    expect(formatPrice(12)).toBe('12,00\u00a0€') // non-breaking space keeps "12,00 €" on one line
  })
})
