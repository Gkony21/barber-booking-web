import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

const barber = {
  id: 4, name: 'Thanos', bio: null, experienceYears: null, specialty: null, address: null, city: 'Αθήνα', status: 'APPROVED',
  autoConfirmBookings: true, shopId: null, shopName: null, shopAddress: null, shopCity: null, bookingWindowDays: 14,
}
const service = { id: 9, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 12, kind: 'MAIN', active: true }
const booked = (id: number, date: string, start: string, end: string, customerName: string) => ({
  id, barberId: 4, barberName: 'Thanos', customerId: null, customerName, customerPhone: null, serviceId: 9, serviceName: 'Κούρεμα',
  extras: [], durationMinutes: 30, price: 12, startTime: `${date}T${start}:00+02:00`, endTime: `${date}T${end}:00+02:00`,
  status: 'CONFIRMED', manual: true, cancelledBy: null, note: null,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z')) // Tuesday 10:00 in Athens
})
afterEach(() => vi.useRealTimers())

function api() {
  return mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: [] }),
    'GET /barbers/me/appointments?from=2026-10-01&to=2026-10-31': () => ({ json: [] }),
    // Thursday 3 December: one appointment at 16:00.
    'GET /barbers/me/appointments?from=2026-12-01&to=2026-12-31': () => ({
      json: [booked(51, '2026-12-03', '16:00', '16:30', 'Κώστας')],
    }),
    'GET /barbers/me/appointments?from=2026-11-01&to=2026-11-30': () => ({ json: [] }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'POST /barbers/me/time-off': () => ({ status: 201, json: {} }),
    'GET /barbers/me/services': () => ({ json: [service] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'THURSDAY', startTime: '10:00', endTime: '18:00' }] }),
  })
}

it('reaches a day two months ahead in a few taps and shows what is booked and what is free', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  api()
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Επόμενος μήνας' }))
  await user.click(screen.getByRole('button', { name: 'Επόμενος μήνας' }))
  await user.click(await screen.findByRole('button', { name: /3 Δεκεμβρίου, 1 ραντεβού/ }))

  expect(await screen.findByText('Κώστας')).toBeInTheDocument()
  expect(screen.getByText('Ελεύθερο 10:00–16:00')).toBeInTheDocument()
  expect(screen.getByText('Ελεύθερο 16:30–18:00')).toBeInTheDocument()

  // Only what is booked.
  await user.click(screen.getByRole('radio', { name: 'Μόνο ραντεβού' }))
  expect(screen.queryByText(/Ελεύθερο/)).not.toBeInTheDocument()
  expect(screen.getByText('Κώστας')).toBeInTheDocument()
})

it('opens the manual booking form at the free time that was tapped', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  api()
  renderApp('/barber')
  const user = userEvent.setup()

  // Thursday 15 October, all free.
  await user.click(await screen.findByRole('button', { name: /^Πέμπτη 15 Οκτωβρίου$/ }))
  const free = (await screen.findByText('Ελεύθερο 10:00–18:00')).parentElement!
  await user.click(within(free).getByRole('button', { name: '+ Κλείσε' }))

  const form = (await screen.findByRole('heading', { name: 'Νέο ραντεβού' })).closest('form')!
  expect(within(form).getByLabelText('Μέρα')).toHaveValue('2026-10-15')
  expect(within(form).getByLabelText('Ώρα')).toHaveValue('10:00')
})

it('blocks part of a free stretch for the barber', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  const calls = api()
  calls.length = 0
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: /^Πέμπτη 15 Οκτωβρίου$/ }))
  const free = (await screen.findByText('Ελεύθερο 10:00–18:00')).parentElement!
  await user.click(within(free).getByRole('button', { name: 'Μπλόκαρε' }))
  await user.selectOptions(screen.getByLabelText('Από'), '12:00')
  await user.selectOptions(screen.getByLabelText('Έως'), '14:00')
  await user.type(screen.getByLabelText(/Λόγος/), 'Γιατρός')
  await user.click(screen.getByRole('button', { name: 'Μπλοκάρισμα' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'POST /barbers/me/time-off')?.body).toEqual({
      startDate: '2026-10-15', endDate: '2026-10-15', startTime: '12:00', endTime: '14:00', reason: 'Γιατρός',
    }),
  )
})
