import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../test/render'

const barber = {
  id: 1, slug: 'nick', name: 'Barber Nick', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: null,
  city: 'Αθήνα', status: 'APPROVED', autoConfirmBookings: true, slotStepMinutes: 30, bookingWindowDays: 14, minNoticeMinutes: 60,
  bufferMinutes: 0, shopId: null, shopName: null, shopAddress: null, shopCity: null, coverUrl: null, photoCount: 0, fromPrice: 12,
  nextAvailable: null,
}
const appointment = {
  id: 34, barberId: 1, barberName: 'Barber Nick', customerId: 2, customerName: 'Maria', customerPhone: '6900000000',
  serviceId: 7, serviceName: 'Κούρεμα', extras: [{ name: 'Λούσιμο', price: 0, durationMinutes: 15 }], durationMinutes: 45,
  price: 12, startTime: '2026-10-14T10:00:00+03:00', endTime: '2026-10-14T10:45:00+03:00', status: 'CONFIRMED',
  manual: false, cancelledBy: null, note: null,
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z')) // Tuesday 10:00 in Athens
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('moves an appointment to a new time, keeping its services', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  const calls = mockApi({
    'GET /appointments/me': () => ({ json: [appointment] }),
    'GET /barbers/1': () => ({ json: barber }),
    'GET /barbers/1/services': () => ({ json: [] }),
    'GET /barbers/1/photos': () => ({ json: [] }),
    'GET /barbers/1/availability?minutes=45&date=2026-10-13': () => ({
      json: { barberId: 1, serviceId: null, date: '2026-10-13', durationMinutes: 45, startTimes: ['17:00'] },
    }),
    'POST /appointments/34/reschedule': () => ({ json: { ...appointment, startTime: '2026-10-13T17:00:00+03:00', endTime: '2026-10-13T17:45:00+03:00' } }),
  })
  renderApp('/appointments')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('link', { name: 'Αλλαγή ώρας' }))

  // The services stay; only day and time are chosen.
  expect(await screen.findByRole('heading', { name: 'Αλλαγή ώρας' })).toBeInTheDocument()
  expect(screen.getByText('Κούρεμα + Λούσιμο')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Τιμοκατάλογος' })).not.toBeInTheDocument()

  await user.click(await screen.findByRole('button', { name: '17:00' }))
  await user.click(screen.getByRole('button', { name: /Μετακίνηση σε Τρί 13 · 17:00/ }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'POST /appointments/34/reschedule')?.body).toEqual({ startTime: '2026-10-13T17:00' }),
  )
})

it('lets the barber mark a started appointment as a no-show and flags repeat no-shows', async () => {
  logInAs('nick@test.gr', 'BARBER')
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const started = { ...appointment, id: 40, startTime: '2026-10-13T09:30:00+03:00', endTime: '2026-10-13T10:15:00+03:00' }
  const later = { ...appointment, id: 41, startTime: '2026-10-13T17:00:00+03:00', endTime: '2026-10-13T17:45:00+03:00', customerNoShows: 2 }
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: [started, later] }),
    'GET /barbers/me/appointments?from=2026-10-01&to=2026-10-31': () => ({ json: [started, later] }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [{ id: 7, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 12, kind: 'MAIN', active: true }] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '20:00' }] }),
    'POST /barbers/me/appointments/40/no-show': () => ({ json: { ...started, status: 'NO_SHOW' } }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  expect(await screen.findByText('Δεν ήρθε 2 φορές')).toBeInTheDocument()
  const row = (await screen.findByText('09:30')).closest('article')!
  expect(within(row).queryByRole('button', { name: 'Ακύρωση' })).not.toBeInTheDocument()
  await user.click(within(row).getByRole('button', { name: 'Δεν ήρθε' }))

  await vi.waitFor(() => expect(calls.some((c) => c.key === 'POST /barbers/me/appointments/40/no-show')).toBe(true))
})
