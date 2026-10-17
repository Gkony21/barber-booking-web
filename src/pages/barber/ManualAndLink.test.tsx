import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

const barber = {
  id: 4, slug: 'giorgos', name: 'Γιώργος', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: 'Λεωνίδου 84',
  city: 'Σπάρτη', status: 'APPROVED', autoConfirmBookings: true, slotStepMinutes: 30, shopId: null, shopName: null,
  coverUrl: null, photoCount: 0, fromPrice: 14, nextAvailable: null, latitude: null, longitude: null,
}
const service = { id: 9, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 14, active: true }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('opens a barber page from their short link', async () => {
  mockApi({
    'GET /barbers/by-link/giorgos': () => ({ json: barber }),
    'GET /barbers/4/services': () => ({ json: [service] }),
    'GET /barbers/4/photos': () => ({ json: [] }),
    'GET /barbers/4/availability?serviceId=9&date=2026-10-13': () => ({ json: { barberId: 4, serviceId: 9, date: '2026-10-13', durationMinutes: 30, startTimes: [] } }),
  })
  renderApp('/giorgos')

  expect(await screen.findByRole('heading', { name: 'Γιώργος' })).toBeInTheDocument()
})

it('shows "not found" for a link nobody has', async () => {
  mockApi({ 'GET /barbers/by-link/nobody': () => ({ status: 404, json: { detail: 'Barber not found' } }) })
  renderApp('/nobody')

  expect(await screen.findByRole('heading', { name: 'Δεν βρέθηκε' })).toBeInTheDocument()
})

it('lets a barber enter a phone booking, and explains overlaps', async () => {
  logInAs('giorgos@test.gr', 'BARBER')
  let attempts = 0
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [service] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '20:00' }] }),
    'POST /barbers/me/appointments': () =>
      ++attempts === 1 ? { status: 409, json: { detail: 'This time overlaps another appointment', code: 'OVERLAPS_APPOINTMENT' } } : { status: 201, json: { id: 1 } },
  })
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: '+ Νέο ραντεβού' }))
  await user.selectOptions(screen.getByLabelText('Ώρα'), '18:00')
  await user.type(screen.getByLabelText('Όνομα πελάτη'), 'Κώστας')
  await user.type(screen.getByLabelText('Κινητό (προαιρετικό)'), '6911111111')
  await user.click(screen.getByRole('button', { name: 'Καταχώριση' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Η ώρα συμπίπτει με άλλο ραντεβού')

  await user.click(screen.getByRole('button', { name: 'Καταχώριση' }))
  expect(await screen.findByText('Το ραντεβού καταχωρίστηκε.')).toBeInTheDocument()
  expect(calls.filter((c) => c.key === 'POST /barbers/me/appointments').at(-1)?.body).toEqual({
    serviceId: 9, startTime: '2026-10-13T18:00', customerName: 'Κώστας', customerPhone: '6911111111',
  })
})

it('shows the barber their link and explains a taken one', async () => {
  logInAs('giorgos@test.gr', 'BARBER')
  mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/photos': () => ({ json: [] }),
    'PUT /barbers/me': () => ({ status: 409, json: { detail: 'This link is already taken', code: 'LINK_TAKEN' } }),
  })
  renderApp('/barber/profile')
  const user = userEvent.setup()

  expect(await screen.findByText(`${window.location.origin}/giorgos`)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Αλλαγή συνδέσμου' }))
  const field = screen.getByLabelText('Σύνδεσμος')
  await user.clear(field)
  await user.type(field, 'Nick Cuts!')
  expect(field).toHaveValue('nickcuts')
  await user.click(screen.getAllByRole('button', { name: 'Αποθήκευση' })[0])

  expect(await screen.findByRole('alert')).toHaveTextContent('δεν είναι διαθέσιμος')
})
