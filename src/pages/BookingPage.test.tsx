import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../test/render'

const barber = {
  id: 1, name: 'Barber Nick', bio: null, experienceYears: 5, specialty: null, address: 'Ερμού 12', city: 'Αθήνα',
  status: 'APPROVED', autoConfirmBookings: true, shopId: 3, shopName: "Nick's Barbershop",
}
const services = [
  { id: 7, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 12, active: true },
  { id: 8, name: 'Κούρεμα & γένια', description: null, durationMinutes: 45, price: 18, active: true },
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z')) // Tuesday 10:00 in Athens
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function api(bookResponse: { status?: number; json?: unknown }) {
  return mockApi({
    'GET /barbers/1': () => ({ json: barber }),
    'GET /barbers/1/services': () => ({ json: services }),
    'GET /barbers/1/photos': () => ({ json: [] }),
    'GET /barbers/1/availability?serviceId=7&date=2026-10-13': () => ({
      json: { barberId: 1, serviceId: 7, date: '2026-10-13', durationMinutes: 30, startTimes: ['17:00', '18:00'] },
    }),
    'POST /appointments': () => bookResponse,
  })
}

it('books the chosen service, day and time', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  const calls = api({
    status: 201,
    json: {
      id: 99, barberId: 1, barberName: 'Barber Nick', serviceId: 7, serviceName: 'Κούρεμα', durationMinutes: 30, price: 12,
      startTime: '2026-10-13T18:00:00+03:00', endTime: '2026-10-13T18:30:00+03:00', status: 'CONFIRMED',
    },
  })
  renderApp('/barbers/1')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: 'Barber Nick' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Κούρεμα.*12,00.*30 λεπτά/ })).toHaveAttribute('aria-pressed', 'true')

  await user.click(await screen.findByRole('button', { name: '18:00' }))
  await user.click(screen.getByRole('button', { name: /Κλείσε Τρί 13 · 18:00/ }))

  expect(await screen.findByText('Κλείστηκε')).toBeInTheDocument()
  expect(screen.getByText('18:00')).toBeInTheDocument()
  expect(screen.getByText('Τρίτη 13 Οκτωβρίου')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Στο ημερολόγιο' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Οδηγίες' })).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
  expect(calls.find((c) => c.key === 'POST /appointments')?.body).toEqual({
    barberId: 1, serviceId: 7, startTime: '2026-10-13T18:00',
  })
})

it('asks the customer to pick another time when the slot was just taken', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  api({ status: 409, json: { detail: 'This time is no longer available', code: 'SLOT_TAKEN' } })
  renderApp('/barbers/1')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: '18:00' }))
  await user.click(screen.getByRole('button', { name: /Κλείσε Τρί 13/ }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Αυτή η ώρα μόλις κλείστηκε')
  expect(screen.getByRole('button', { name: /Διάλεξε ώρα/ })).toBeDisabled()
})

it('sends visitors to log in before booking', async () => {
  api({})
  renderApp('/barbers/1')

  const link = await screen.findByRole('link', { name: 'Συνδέσου για να κλείσεις' })
  expect(link).toHaveAttribute('href', '/login?next=%2Fbarbers%2F1')
})

it('shows the free times for the selected day only', async () => {
  api({})
  renderApp('/barbers/1')

  const times = await screen.findByRole('heading', { name: 'Τι ώρα;' })
  const section = times.closest('section')!
  expect(await within(section).findAllByRole('button')).toHaveLength(2)
})
