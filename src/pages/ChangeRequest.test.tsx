import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../test/render'

// A barber who approves by hand: moving a confirmed appointment waits for their answer.
const barber = {
  id: 1, slug: 'nick', name: 'Barber Nick', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: null,
  city: 'Αθήνα', status: 'APPROVED', autoConfirmBookings: false, slotStepMinutes: 30, bookingWindowDays: 14, minNoticeMinutes: 60,
  bufferMinutes: 0, shopId: null, shopName: null, shopAddress: null, shopCity: null, coverUrl: null, photoCount: 0,
  featuredServiceName: 'Κούρεμα', featuredPrice: 12, nextAvailable: null,
}
const appointment = {
  id: 34, barberId: 1, barberName: 'Barber Nick', customerId: 2, customerName: 'Maria', customerPhone: '6900000000',
  serviceId: 7, serviceName: 'Κούρεμα', extras: [], durationMinutes: 30, price: 12,
  startTime: '2026-10-14T10:00:00+03:00', endTime: '2026-10-14T10:30:00+03:00', status: 'CONFIRMED',
  manual: false, cancelledBy: null, note: null, requestedStartTime: null, originalStartTime: null,
}
const service = (id: number, name: string, price: number, featured = false) => ({
  id, name, description: null, durationMinutes: 30, price, kind: 'MAIN', active: true, featured,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z')) // Tuesday 10:00 in Athens
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('tells the customer the current time holds until the barber answers the change', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  const asked = { ...appointment, requestedStartTime: '2026-10-13T17:00:00+03:00' }
  mockApi({
    'GET /appointments/me': () => ({ json: [appointment] }),
    'GET /barbers/1': () => ({ json: barber }),
    'GET /barbers/1/services': () => ({ json: [] }),
    'GET /barbers/1/photos': () => ({ json: [] }),
    'GET /appointments/34/days?from=2026-10-13&to=2026-10-27': () => ({ json: [{ date: '2026-10-13', status: 'OPEN' }] }),
    'GET /appointments/34/availability?date=2026-10-13': () => ({
      json: { barberId: 1, serviceId: null, date: '2026-10-13', durationMinutes: 30, startTimes: ['17:00'] },
    }),
    'POST /appointments/34/reschedule': () => ({ json: asked }),
  })
  renderApp('/barbers/1?reschedule=34')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: '17:00' }))
  await user.click(screen.getByRole('button', { name: /Μετακίνηση σε Τρί 13 · 17:00/ }))

  expect(await screen.findByText('Η αλλαγή στάλθηκε')).toBeInTheDocument()
  expect(screen.getByText('17:00')).toBeInTheDocument()
  expect(screen.getByText(/Μέχρι να απαντηθεί, ισχύει η τωρινή ώρα: Τετάρτη 14 Οκτωβρίου στις 10:00/)).toBeInTheDocument()
  // Not in the calendar yet: the new time may not hold.
  expect(screen.queryByRole('button', { name: 'Στο ημερολόγιο' })).not.toBeInTheDocument()
})

it('shows the waiting change on the appointment and lets the customer take it back', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const asked = { ...appointment, requestedStartTime: '2026-10-13T17:00:00+03:00' }
  const calls = mockApi({
    'GET /appointments/me': () => ({ json: [asked] }),
    'POST /appointments/34/withdraw-change': () => ({ json: appointment }),
  })
  renderApp('/appointments')
  const user = userEvent.setup()

  const card = (await screen.findByText(/Ζήτησες αλλαγή για/)).closest('article')!
  expect(within(card).getByText(/Ζήτησες αλλαγή για Τρίτη 13 Οκτωβρίου στις 17:00/)).toBeInTheDocument()
  expect(within(card).getByText('Τετάρτη 14 Οκτωβρίου στις 10:00')).toBeInTheDocument()
  await user.click(within(card).getByRole('button', { name: 'Ακύρωση αλλαγής' }))

  await vi.waitFor(() => expect(calls.some((c) => c.key === 'POST /appointments/34/withdraw-change')).toBe(true))
})

it('shows the barber a change as a request next to the time it would replace', async () => {
  logInAs('nick@test.gr', 'BARBER')
  const original = { ...appointment, startTime: '2026-10-13T11:00:00+03:00', endTime: '2026-10-13T11:30:00+03:00', requestedStartTime: '2026-10-13T17:00:00+03:00' }
  const change = {
    ...appointment, id: 35, status: 'PENDING', startTime: '2026-10-13T17:00:00+03:00', endTime: '2026-10-13T17:30:00+03:00',
    originalStartTime: '2026-10-13T11:00:00+03:00',
  }
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: [original, change] }),
    'GET /barbers/me/appointments?from=2026-10-01&to=2026-10-31': () => ({ json: [original, change] }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [service(7, 'Κούρεμα', 12)] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '20:00' }] }),
    'POST /barbers/me/appointments/35/confirm': () => ({ json: { ...original, startTime: change.startTime, requestedStartTime: null } }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  const requests = await screen.findByRole('heading', { name: /Αιτήματα για έγκριση/ })
  const request = within(requests.closest('section')!).getByText('Αλλαγή ώρας').closest('article')!
  expect(within(request).getByText('Αντί για Τρίτη 13 Οκτωβρίου στις 11:00')).toBeInTheDocument()
  expect(screen.getAllByText('Ζητά αλλαγή για Τρίτη 13 Οκτωβρίου στις 17:00').length).toBeGreaterThan(0)
  await user.click(within(request).getByRole('button', { name: 'Αποδοχή' }))

  await vi.waitFor(() => expect(calls.some((c) => c.key === 'POST /barbers/me/appointments/35/confirm')).toBe(true))
})

it('lets the barber choose the service shown on their card', async () => {
  logInAs('nick@test.gr', 'BARBER')
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/services': () => ({ json: [service(7, 'Κούρεμα', 12, true), service(8, 'Παιδικό', 8)] }),
    'POST /barbers/me/services/8/feature': () => ({ status: 204 }),
  })
  renderApp('/barber/services')
  const user = userEvent.setup()

  const haircut = (await screen.findByText('Κούρεμα')).closest('article')!
  expect(within(haircut).getByText('★ Στην κάρτα')).toBeInTheDocument()
  const kids = screen.getByText('Παιδικό').closest('article')!
  await user.click(within(kids).getByRole('button', { name: '☆ Στην κάρτα' }))

  await vi.waitFor(() => expect(calls.some((c) => c.key === 'POST /barbers/me/services/8/feature')).toBe(true))
})

it('starts the booking on the service the barber shows on their card', async () => {
  mockApi({
    'GET /barbers/1': () => ({ json: barber }),
    'GET /barbers/1/services': () => ({ json: [service(8, 'Παιδικό', 8), service(7, 'Κούρεμα', 12, true)] }),
    'GET /barbers/1/photos': () => ({ json: [] }),
    'GET /barbers/1/days?from=2026-10-13&to=2026-10-27&serviceId=7': () => ({ json: [{ date: '2026-10-13', status: 'OPEN' }] }),
    'GET /barbers/1/availability?serviceId=7&date=2026-10-13': () => ({
      json: { barberId: 1, serviceId: 7, date: '2026-10-13', durationMinutes: 30, startTimes: ['17:00'] },
    }),
  })
  renderApp('/barbers/1')

  expect(await screen.findByRole('radio', { name: /Κούρεμα/ })).toBeChecked()
  expect(screen.getByRole('radio', { name: /Παιδικό/ })).not.toBeChecked()
})
