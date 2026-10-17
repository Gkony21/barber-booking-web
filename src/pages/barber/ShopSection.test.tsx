import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

const barber = {
  id: 4, slug: 'nikos', name: 'Νίκος', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: null,
  city: 'Αθήνα', status: 'APPROVED', autoConfirmBookings: true, slotStepMinutes: 30, shopId: null, shopName: null,
  shopAddress: null, shopCity: null, bookingWindowDays: 14, coverUrl: null, photoCount: 0, fromPrice: null,
  nextAvailable: null, latitude: null, longitude: null,
}
const invitation = {
  id: 11, shopId: 3, shopName: 'Fade House', shopAddress: 'Ερμού 1', shopCity: 'Αθήνα', ownerName: 'Γιώργος',
  barberId: 4, barberName: 'Νίκος', status: 'PENDING', createdAt: '2026-10-12T10:00:00Z',
}
const shop = { id: 3, name: 'Fade House', address: 'Ερμού 1', city: 'Αθήνα', phoneNumber: null, ownerBarberId: 4 }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z'))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('shows a shop invitation and joins the shop only when accepted', async () => {
  logInAs('nikos@test.gr', 'BARBER')
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/photos': () => ({ json: [] }),
    'GET /barbers/me/invitations': () => ({ json: [invitation] }),
    'POST /barbers/me/invitations/11/accept': () => ({ json: shop }),
  })
  renderApp('/barber/profile')
  const user = userEvent.setup()

  const card = (await screen.findByText('Πρόσκληση σε κατάστημα')).closest('article')!
  expect(within(card).getByText('Fade House')).toBeInTheDocument()
  // The owner's name is a labelled value, not part of a sentence.
  expect(within(card).getByText('Από: Γιώργος')).toBeInTheDocument()

  await user.click(within(card).getByRole('button', { name: 'Αποδοχή' }))
  await vi.waitFor(() => expect(calls.some((c) => c.key === 'POST /barbers/me/invitations/11/accept')).toBe(true))
})

it('lets the owner invite a barber and explains an unknown email in Greek', async () => {
  logInAs('nikos@test.gr', 'BARBER')
  let attempts = 0
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: { ...barber, shopId: 3, shopName: 'Fade House' } }),
    'GET /barbers/me/photos': () => ({ json: [] }),
    'GET /shops/3': () => ({ json: shop }),
    'GET /barbers?shopId=3': () => ({ json: [{ ...barber, shopId: 3 }] }),
    'GET /shops/3/invitations': () => ({ json: attempts > 1 ? [{ ...invitation, barberName: 'Κώστας' }] : [] }),
    'POST /shops/3/invitations': () =>
      ++attempts === 1
        ? { status: 404, json: { detail: 'No barber profile for this email', code: 'NO_BARBER_FOR_EMAIL' } }
        : { status: 201, json: invitation },
  })
  renderApp('/barber/profile')
  const user = userEvent.setup()

  expect(await screen.findByText('Κάτοχος')).toBeInTheDocument()
  const email = screen.getByLabelText('Email του barber')

  await user.type(email, 'nobody@test.gr')
  await user.click(screen.getByRole('button', { name: 'Αποστολή πρόσκλησης' }))
  expect(await screen.findByText(/Δεν βρέθηκε barber με αυτό το email/)).toBeInTheDocument()

  await user.clear(email)
  await user.type(email, 'kostas@test.gr')
  await user.click(screen.getByRole('button', { name: 'Αποστολή πρόσκλησης' }))
  expect(await screen.findByText(/Η πρόσκληση στάλθηκε/)).toBeInTheDocument()
  expect(await screen.findByText('Κώστας')).toBeInTheDocument()
  expect(calls.filter((c) => c.key === 'POST /shops/3/invitations').at(-1)?.body).toEqual({ email: 'kostas@test.gr' })
})

it('saves how far ahead customers can book', async () => {
  logInAs('nikos@test.gr', 'BARBER')
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/photos': () => ({ json: [] }),
    'GET /barbers/me/invitations': () => ({ json: [] }),
    'PUT /barbers/me': () => ({ json: { ...barber, bookingWindowDays: 30 } }),
  })
  renderApp('/barber/profile')
  const user = userEvent.setup()

  await user.click(await screen.findByRole('radio', { name: '1 μήνα' }))
  await user.click(screen.getAllByRole('button', { name: 'Αποθήκευση' }).at(-1)!)

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'PUT /barbers/me')?.body).toMatchObject({ bookingWindowDays: 30 }),
  )
})
