import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

// Tuesday 13 October 2026, 10:07 in Athens; the barber works 10:00–20:00.
const barber = {
  id: 4, slug: 'giorgos', name: 'Γιώργος', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: 'Λεωνίδου 84',
  city: 'Σπάρτη', status: 'APPROVED', autoConfirmBookings: true, slotStepMinutes: 30, shopId: null, shopName: null, shopAddress: null, shopCity: null, bookingWindowDays: 14,
  coverUrl: null, photoCount: 0, featuredServiceName: 'Κούρεμα', featuredPrice: 14, nextAvailable: null, latitude: null, longitude: null,
}
const kids = { id: 8, name: 'Παιδικό', description: null, durationMinutes: 30, price: 8, kind: 'MAIN', active: true, featured: false }
const haircut = { id: 9, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 14, kind: 'MAIN', active: true, featured: true }
const wash = { id: 10, name: 'Λούσιμο', description: null, durationMinutes: 10, price: 2, kind: 'EXTRA', active: true, featured: false }
const appointment = (id: number, start: string, extra: Partial<Record<string, unknown>> = {}) => ({
  id, barberId: 4, barberName: 'Γιώργος', customerId: 2, customerName: 'Μαρία', customerPhone: '6900000000', serviceId: 9, serviceName: 'Κούρεμα',
  extras: [{ serviceId: 10, name: 'Λούσιμο', price: 2, durationMinutes: 10 }], durationMinutes: 40, price: 16,
  startTime: `2026-10-13T${start}:00+03:00`, endTime: `2026-10-13T${start}:00+03:00`, status: 'CONFIRMED',
  manual: false, cancelledBy: null, note: null, customerNoShows: 0, requestedStartTime: null, originalStartTime: null, ...extra,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:07:00Z'))
  logInAs('giorgos@test.gr', 'BARBER')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function schedule(appointments: unknown[], extra: Record<string, () => { status?: number; json?: unknown }> = {}) {
  return mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: appointments }),
    'GET /barbers/me/appointments?from=2026-10-01&to=2026-10-31': () => ({ json: appointments }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [kids, haircut, wash] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '20:00' }] }),
    ...extra,
  })
}

it('shows the day at a glance: appointments, requests and roughly what today brings in', async () => {
  schedule([appointment(1, '11:00'), appointment(2, '12:00', { status: 'PENDING', price: 14 })])
  renderApp('/barber')

  const stats = await screen.findByRole('region', { name: 'Σήμερα' })
  expect(within(stats).getByText('2')).toBeInTheDocument() // appointments
  expect(within(stats).getByText('1')).toBeInTheDocument() // requests
  expect(within(stats).getByText('~16€')).toBeInTheDocument() // only the confirmed one counts
})

it('lets the barber move an app booking and change its services', async () => {
  const calls = schedule([appointment(1, '11:00')], {
    'GET /barbers/me/availability?minutes=40&date=2026-10-13&except=1': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 40, startTimes: ['11:00', '11:15', '15:00'] },
    }),
    'GET /barbers/me/availability?minutes=30&date=2026-10-13&except=1': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 30, startTimes: ['11:00', '15:00'] },
    }),
    'PUT /barbers/me/appointments/1': () => ({ json: appointment(1, '15:00') }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Αλλαγή' }))
  expect(screen.getByRole('heading', { name: 'Αλλαγή ραντεβού' })).toBeInTheDocument()
  // The customer's own details are not the barber's to edit; services and time are.
  expect(screen.queryByLabelText('Όνομα πελάτη')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Υπηρεσία')).toHaveValue('9')
  const extra = screen.getByRole('checkbox', { name: /Λούσιμο/ })
  expect(extra).toBeChecked()
  await vi.waitFor(() => expect(screen.getByLabelText('Ώρα')).toHaveValue('11:00'))

  await user.click(extra)
  await user.selectOptions(screen.getByLabelText('Ώρα'), '15:00')
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση αλλαγών' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'PUT /barbers/me/appointments/1')?.body).toEqual({
      serviceId: 9, extraIds: [], startTime: '2026-10-13T15:00',
    }),
  )
})

it('keeps an appointment outside working hours at its own time when changing it', async () => {
  schedule([appointment(1, '21:00', { manual: true, customerName: 'Κώστας', customerId: null })], {
    'GET /barbers/me/availability?minutes=40&date=2026-10-13&except=1': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 40, startTimes: ['15:00'] },
    }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Αλλαγή' }))
  await vi.waitFor(() => expect(screen.getByLabelText('Ώρα')).toHaveValue('21:00'))
  // Phone bookings keep their details editable.
  expect(screen.getByLabelText('Όνομα πελάτη')).toHaveValue('Κώστας')
})

it('keeps requests and appointments waiting for a change out of editing', async () => {
  schedule([appointment(1, '11:00', { status: 'PENDING' }), appointment(2, '12:00', { requestedStartTime: '2026-10-13T16:00:00+03:00' })])
  renderApp('/barber')

  await screen.findAllByText('Μαρία')
  expect(screen.queryByRole('button', { name: 'Αλλαγή' })).not.toBeInTheDocument()
})

it('books someone who just sat down at the current quarter hour, on the usual service', async () => {
  const calls = schedule([], {
    'POST /barbers/me/appointments': () => ({ status: 201, json: { id: 3 } }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Τώρα' }))
  expect(screen.getByRole('heading', { name: 'Πελάτης τώρα' })).toBeInTheDocument()
  expect(screen.getByLabelText('Υπηρεσία')).toHaveValue('9') // the starred service, not the first in the list
  expect(screen.getByLabelText(/Εκτός ωραρίου/)).toBeChecked()
  expect(screen.getByLabelText('Ώρα')).toHaveValue('10:00')
  await user.type(screen.getByLabelText('Όνομα πελάτη'), 'Κώστας')
  await user.click(screen.getByRole('button', { name: 'Καταχώριση' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'POST /barbers/me/appointments')?.body).toEqual({
      serviceId: 9, extraIds: [], startTime: '2026-10-13T10:00', customerName: 'Κώστας',
    }),
  )
})
