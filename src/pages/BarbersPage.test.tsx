import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mockApi, renderApp } from '../test/render'

const base = {
  avatarUrl: null, bio: null, experienceYears: null, specialty: null, status: 'APPROVED', autoConfirmBookings: true,
  slotStepMinutes: 30, shopId: null, shopName: null, shopAddress: null, shopCity: null, bookingWindowDays: 14, latitude: null, longitude: null,
}
const nikos = { ...base, id: 1, name: 'Nikos', address: 'Ερμού 12', city: 'Αθήνα', coverUrl: '/media/c.jpg', photoCount: 14, fromPrice: 8, nextAvailable: '2026-10-13T17:30:00+03:00' }
const giorgos = { ...base, id: 2, name: 'Giorgos', address: null, city: 'Σπάρτη', coverUrl: null, photoCount: 0, fromPrice: 14, nextAvailable: '2026-10-14T10:00:00+03:00' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z')) // Tuesday 10:00 Athens
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('shows each barber with cover, next free time, photo count and starting price', async () => {
  mockApi({ 'GET /barbers': () => ({ json: [nikos, giorgos] }) })
  renderApp('/')

  const cards = await screen.findAllByRole('link', { name: /Nikos|Giorgos/ })
  expect(within(cards[0]).getByText('Ελεύθερο 17:30')).toBeInTheDocument()
  expect(within(cards[0]).getByText('14 φωτογραφίες')).toBeInTheDocument()
  expect(within(cards[0]).getByText('8,00 €')).toBeInTheDocument()
  expect(within(cards[1]).getByText('Αύριο 10:00')).toBeInTheDocument()
})

it('filters to barbers free today', async () => {
  const calls = mockApi({
    'GET /barbers': () => ({ json: [nikos, giorgos] }),
    'GET /barbers?availableToday=true': () => ({ json: [nikos] }),
  })
  renderApp('/')
  const user = userEvent.setup()

  await screen.findByText('Αύριο 10:00')
  await user.click(screen.getByRole('button', { name: 'Ελεύθεροι σήμερα' }))

  expect(await screen.findByRole('button', { name: 'Ελεύθεροι σήμερα' })).toHaveAttribute('aria-pressed', 'true')
  await vi.waitFor(() => expect(screen.queryByText('Αύριο 10:00')).not.toBeInTheDocument())
  expect(calls.some((c) => c.key === 'GET /barbers?availableToday=true')).toBe(true)
})
