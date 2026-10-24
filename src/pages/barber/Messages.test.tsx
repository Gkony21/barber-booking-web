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
const phoneBooking = {
  id: 1, barberId: 4, barberName: 'Γιώργος', customerId: null, customerName: 'Κώστας', customerPhone: '6911111111', serviceId: 9,
  serviceName: 'Κούρεμα', extras: [], durationMinutes: 30, price: 14, startTime: '2026-10-14T18:00:00+03:00', endTime: '2026-10-14T18:30:00+03:00',
  status: 'CONFIRMED', manual: true, cancelledBy: null, note: null, customerNoShows: 0, clientKey: 'p6911111111',
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

function schedule(appointments: unknown[], extra: Record<string, () => { status?: number; json?: unknown }> = {}) {
  return mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/appointments?from=2026-10-13&to=2027-01-11': () => ({ json: appointments }),
    'GET /barbers/me/appointments?from=2026-10-01&to=2026-10-31': () => ({ json: appointments }),
    'GET /barbers/me/time-off': () => ({ json: [] }),
    'GET /barbers/me/services': () => ({ json: [haircut] }),
    'GET /barbers/me/working-hours': () => ({ json: [{ dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '20:00' }] }),
    ...extra,
  })
}

it('reminds a phone customer by Viber, WhatsApp or SMS, with the booking link if wanted', async () => {
  schedule([phoneBooking])
  renderApp('/barber')
  const user = userEvent.setup()

  // Tomorrow's appointment: pick that day in the month.
  await user.click(await screen.findByRole('button', { name: /Τετάρτη 14 Οκτωβρίου/ }))
  await user.click(await screen.findByRole('button', { name: 'Μήνυμα' }))

  const panel = screen.getByRole('region', { name: 'Μήνυμα' })
  const text = within(panel).getByLabelText('Μήνυμα προς 6911111111')
  expect(text).toHaveValue(
    'Γεια σου! Σου θυμίζω το ραντεβού σου αύριο, Τετάρτη 14 Οκτωβρίου, στις 18:00. Αν δεν μπορείς να έρθεις, πες μου να δώσω την ώρα σε άλλον. Τα λέμε!',
  )
  const viber = within(panel).getByRole('link', { name: 'Viber' })
  expect(viber.getAttribute('href')).toMatch(/^viber:\/\/chat\?number=%2B306911111111&draft=/)
  expect(decodeURIComponent(viber.getAttribute('href')!)).toContain('κλείνεις και από εδώ: http://localhost:3000/giorgos')
  expect(within(panel).getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/306911111111\?text=/)
  expect(within(panel).getByRole('link', { name: 'SMS' }).getAttribute('href')).toMatch(/^sms:\+306911111111\?&body=/)

  // The barber can change the text and leave the link out.
  await user.clear(text)
  await user.type(text, 'Σε περιμένω αύριο!')
  await user.click(within(panel).getByLabelText(/Βάλε και το link κράτησής σου/))
  expect(decodeURIComponent(within(panel).getByRole('link', { name: 'SMS' }).getAttribute('href')!)).toBe('sms:+306911111111?&body=Σε περιμένω αύριο!')
})

it('offers to send a confirmation right after entering a phone booking', async () => {
  schedule([], {
    'GET /barbers/me/availability?minutes=30&date=2026-10-13': () => ({
      json: { barberId: 4, serviceId: null, date: '2026-10-13', durationMinutes: 30, startTimes: ['17:00'] },
    }),
    'POST /barbers/me/appointments': () => ({ status: 201, json: { ...phoneBooking, startTime: '2026-10-13T17:00:00+03:00' } }),
  })
  renderApp('/barber')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: '+ Νέο ραντεβού' }))
  await user.type(screen.getByLabelText('Όνομα πελάτη'), 'Κώστας')
  await user.type(screen.getByLabelText('Κινητό (προαιρετικό)'), '6911111111')
  await vi.waitFor(() => expect(screen.getByLabelText('Ώρα')).toHaveValue('17:00'))
  await user.click(screen.getByRole('button', { name: 'Καταχώριση' }))

  await user.click(await screen.findByRole('button', { name: 'Στείλε επιβεβαίωση' }))
  expect(screen.getByLabelText('Μήνυμα προς 6911111111')).toHaveValue('Γεια σου! Κλείστηκε το ραντεβού σου σήμερα στις 17:00. Τα λέμε!')
})
