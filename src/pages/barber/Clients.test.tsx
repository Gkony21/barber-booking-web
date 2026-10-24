import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

// Tuesday 13 October 2026, 10:00 in Athens.
const barber = {
  id: 4, slug: 'giorgos', name: 'Γιώργος', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: 'Λεωνίδου 84',
  city: 'Σπάρτη', status: 'APPROVED', autoConfirmBookings: true, slotStepMinutes: 30, shopId: null, shopName: null, shopAddress: null, shopCity: null, bookingWindowDays: 14,
  coverUrl: null, photoCount: 0, featuredServiceName: 'Κούρεμα', featuredPrice: 14, nextAvailable: null, latitude: null, longitude: null,
}
const haircut = { id: 9, name: 'Κούρεμα', description: null, durationMinutes: 30, price: 14, kind: 'MAIN', active: true, featured: true }
const beard = { id: 11, name: 'Κούρεμα + μούσι', description: null, durationMinutes: 40, price: 18, kind: 'MAIN', active: true, featured: false }
const wash = { id: 10, name: 'Λούσιμο', description: null, durationMinutes: 10, price: 2, kind: 'EXTRA', active: true, featured: false }
const kostas = {
  key: 'p6911111111', name: 'Κώστας', phone: '6911111111', appCustomer: false, visits: 5, noShows: 1,
  lastVisit: '2026-10-02T18:00:00+03:00', nextVisit: null, lastServiceId: 11, lastExtraIds: [10], note: 'νο 1 στο πλάι',
}
const maria = { ...kostas, key: 'p6900000000', name: 'Μαρία', phone: '6900000000', appCustomer: true, visits: 2, noShows: 0, note: null }
const visit = {
  id: 3, barberId: 4, barberName: 'Γιώργος', customerId: null, customerName: 'Κώστας', customerPhone: '6911111111', serviceId: 11,
  serviceName: 'Κούρεμα + μούσι', extras: [{ serviceId: 10, name: 'Λούσιμο', price: 2, durationMinutes: 10 }], durationMinutes: 50, price: 20,
  startTime: '2026-10-02T18:00:00+03:00', endTime: '2026-10-02T18:50:00+03:00', status: 'CONFIRMED', manual: true, cancelledBy: null, note: null,
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z'))
  logInAs('giorgos@test.gr', 'BARBER')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('lists the customers and finds them by name or number', async () => {
  mockApi({
    'GET /barbers/me/clients': () => ({ json: [kostas, maria] }),
    'GET /barbers/me/clients?q=%CE%BC%CE%B1%CF%81': () => ({ json: [maria] }),
  })
  renderApp('/barber/clients')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: 'Πελάτες' })).toBeInTheDocument()
  const first = await screen.findByRole('link', { name: /Κώστας/ })
  expect(first).toHaveAttribute('href', '/barber/clients/p6911111111')
  expect(within(first).getByText('Δεν ήρθε 1 φορά')).toBeInTheDocument()
  expect(within(first).getByText('6911111111 · 5 επισκέψεις')).toBeInTheDocument()
  expect(within(first).getByText('νο 1 στο πλάι')).toBeInTheDocument()

  await user.type(screen.getByLabelText('Όνομα ή κινητό'), 'μαρ')
  await vi.waitFor(() => expect(screen.queryByRole('link', { name: /Κώστας/ })).not.toBeInTheDocument())
  expect(screen.getByRole('link', { name: /Μαρία/ })).toBeInTheDocument()
})

it('shows a customer with their note, visits and what they had, and books the same again', async () => {
  const calls = mockApi({
    'GET /barbers/me/clients/p6911111111': () => ({ json: { client: kostas, history: [visit] } }),
    'PUT /barbers/me/clients/p6911111111/note': () => ({ json: { ...kostas, note: 'νο 2 στο πλάι' } }),
    'GET /barbers/me/services': () => ({ json: [haircut, beard, wash] }),
    'GET /barbers/me/availability?minutes=50&date=2026-10-13': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 50, startTimes: ['17:00'] },
    }),
    'POST /barbers/me/appointments': () => ({ status: 201, json: { id: 5 } }),
  })
  renderApp('/barber/clients/p6911111111')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: 'Κώστας' })).toBeInTheDocument()
  const stats = screen.getByRole('region', { name: 'Πελάτες' })
  expect(within(stats).getByText('5')).toBeInTheDocument()
  expect(within(stats).getByText('2/10')).toBeInTheDocument()
  expect(screen.getByText('Κούρεμα + μούσι + Λούσιμο · 20,00 €')).toBeInTheDocument()

  const note = screen.getByLabelText('Σημείωση (τη βλέπεις μόνο εσύ)')
  expect(note).toHaveValue('νο 1 στο πλάι')
  await user.clear(note)
  await user.type(note, 'νο 2 στο πλάι')
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση σημείωσης' }))
  expect(await screen.findByText('Η σημείωση αποθηκεύτηκε.')).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'PUT /barbers/me/clients/p6911111111/note')?.body).toEqual({ note: 'νο 2 στο πλάι' })

  await user.click(screen.getByRole('button', { name: 'Ξανά το ίδιο' }))
  expect(screen.getByLabelText('Όνομα πελάτη')).toHaveValue('Κώστας')
  expect(screen.getByLabelText('Κινητό (προαιρετικό)')).toHaveValue('6911111111')
  expect(screen.getByLabelText('Υπηρεσία')).toHaveValue('11')
  expect(screen.getByRole('checkbox', { name: /Λούσιμο/ })).toBeChecked()
  await vi.waitFor(() => expect(screen.getByLabelText('Ώρα')).toHaveValue('17:00'))
  await user.click(screen.getByRole('button', { name: 'Καταχώριση' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'POST /barbers/me/appointments')?.body).toEqual({
      serviceId: 11, extraIds: [10], startTime: '2026-10-13T17:00', customerName: 'Κώστας', customerPhone: '6911111111',
    }),
  )
})

it('suggests known customers while typing a name, with their note and no-shows', async () => {
  mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: [] }),
    'GET /barbers/me/appointments?from=2026-10-01&to=2026-10-31': () => ({ json: [] }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [haircut, beard, wash] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '20:00' }] }),
    'GET /barbers/me/availability?minutes=30&date=2026-10-13': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 30, startTimes: ['17:00'] },
    }),
    'GET /barbers/me/availability?minutes=50&date=2026-10-13': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 50, startTimes: ['17:00'] },
    }),
    'GET /barbers/me/clients?q=%CE%9A%CF%8E&limit=6': () => ({ json: [kostas] }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: '+ Νέο ραντεβού' }))
  await user.type(screen.getByLabelText('Όνομα πελάτη'), 'Κώ')
  const suggestions = await screen.findByRole('list', { name: 'Προηγούμενοι πελάτες' })
  await user.click(within(suggestions).getByRole('button', { name: /Κώστας/ }))

  expect(screen.getByLabelText('Κινητό (προαιρετικό)')).toHaveValue('6911111111')
  expect(screen.getByLabelText('Υπηρεσία')).toHaveValue('11')
  expect(screen.getByText('νο 1 στο πλάι')).toBeInTheDocument()
  expect(screen.getByText('Δεν ήρθε 1 φορά')).toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Προηγούμενοι πελάτες' })).not.toBeInTheDocument()
})
