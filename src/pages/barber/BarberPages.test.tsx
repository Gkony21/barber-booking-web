import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fakeToken, logInAs, mockApi, renderApp } from '../../test/render'

const barber = {
  id: 4, name: 'Thanos', bio: null, experienceYears: null, specialty: null, address: null, city: 'Αθήνα',
  status: 'APPROVED', autoConfirmBookings: false, shopId: null, shopName: null,
}
const service = { id: 9, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 12.5, active: true }
const pendingRequest = {
  id: 31, barberId: 4, barberName: 'Thanos', customerId: 2, customerName: 'Μαρία', customerPhone: '6900000000',
  serviceId: 9, serviceName: 'Κούρεμα', durationMinutes: 30, price: 12.5,
  startTime: '2026-10-14T10:00:00+03:00', endTime: '2026-10-14T10:30:00+03:00', status: 'PENDING', cancelledBy: null, note: null,
}
const APPOINTMENTS = 'GET /barbers/me/appointments?from=2026-10-13&to=2026-10-27'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z')) // Tuesday 10:00 in Athens
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('takes a barber without a profile through setting one up', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  let created = false
  const calls = mockApi({
    'GET /barbers/me': () => (created ? { json: { ...barber, status: 'PENDING' } } : { status: 404, json: { detail: 'Barber profile not found' } }),
    'POST /barbers/me': () => {
      created = true
      return { status: 201, json: { ...barber, status: 'PENDING' } }
    },
    [APPOINTMENTS]: () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [] }),
    'GET /barbers/me/working-hours': () => ({ json: [] }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: 'Στήσε το προφίλ σου' })).toBeInTheDocument()
  await user.type(screen.getByLabelText('Πόλη'), 'Αθήνα')
  await user.click(screen.getByRole('button', { name: 'Δημιουργία προφίλ' }))

  expect(await screen.findByText(/περιμένει έγκριση/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Πρόσθεσε τουλάχιστον μία υπηρεσία' })).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'POST /barbers/me')?.body).toMatchObject({ city: 'Αθήνα', autoConfirmBookings: true })
})

it('lets the barber accept a booking request', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  let accepted = false
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    [APPOINTMENTS]: () => ({ json: [accepted ? { ...pendingRequest, status: 'CONFIRMED' } : pendingRequest] }),
    'GET /barbers/me/services': () => ({ json: [service] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '20:00' }] }),
    'POST /barbers/me/appointments/31/confirm': () => {
      accepted = true
      return { json: { ...pendingRequest, status: 'CONFIRMED' } }
    },
  })
  renderApp('/barber')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: /Αιτήματα για έγκριση · 1/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Κλήση Μαρία' })).toHaveAttribute('href', 'tel:6900000000')

  await user.click(screen.getByRole('button', { name: 'Αποδοχή' }))

  expect(await screen.findByRole('heading', { name: 'Αύριο' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Αποδοχή' })).not.toBeInTheDocument()
  expect(calls.some((c) => c.key === 'POST /barbers/me/appointments/31/confirm')).toBe(true)
})

it('saves a week with a split shift', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  const calls = mockApi({
    'GET /barbers/me/working-hours': () => ({ json: [] }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'PUT /barbers/me/working-hours': (body) => ({ json: body }),
  })
  renderApp('/barber/hours')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('switch', { name: 'Τρίτη: Ανοιχτά' }))
  await user.click(screen.getByRole('button', { name: '+ Διάλειμμα' }))
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση ωραρίου' }))

  expect(await screen.findByText('Το ωράριο αποθηκεύτηκε.')).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'PUT /barbers/me/working-hours')?.body).toEqual([
    { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '14:00' },
    { dayOfWeek: 'TUESDAY', startTime: '17:00', endTime: '20:00' },
  ])
})

it('sends barbers to their schedule after login and keeps customers out of it', async () => {
  mockApi({
    'POST /auth/login': () => ({ json: { token: fakeToken('thanos@test.gr', 'BARBER') } }),
    'GET /barbers/me': () => ({ json: barber }),
    [APPOINTMENTS]: () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [service] }),
    'GET /barbers/me/working-hours': () => ({ json: [] }),
    'GET /barbers': () => ({ json: [] }),
  })
  renderApp('/login')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'thanos@test.gr')
  await user.type(screen.getByLabelText('Κωδικός'), 'pass1234')
  await user.click(screen.getByRole('button', { name: 'Σύνδεση' }))

  expect(await screen.findByRole('heading', { name: 'Πρόγραμμα' })).toBeInTheDocument()
})

it('redirects customers away from barber pages', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  mockApi({ 'GET /barbers': () => ({ json: [] }) })
  renderApp('/barber/services')

  expect(await screen.findByRole('heading', { name: 'Βρες barber' })).toBeInTheDocument()
})
