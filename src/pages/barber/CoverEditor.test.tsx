import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

const barber = {
  id: 4, slug: 'nikos', name: 'Νίκος', avatarUrl: null, coverUrl: null, bio: null, experienceYears: null, specialty: null,
  address: null, city: 'Αθήνα', status: 'PENDING', autoConfirmBookings: true, slotStepMinutes: 30, bookingWindowDays: 14,
  minNoticeMinutes: 60, bufferMinutes: 0, shopId: null, shopName: null, shopAddress: null, shopCity: null, photoCount: 0,
  fromPrice: null, nextAvailable: null, latitude: null, longitude: null,
}

it('shows the default cover until the barber uploads their own', async () => {
  logInAs('nikos@test.gr', 'BARBER')
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/photos': () => ({ json: [] }),
    'PUT /barbers/me/cover': () => ({ json: { ...barber, coverUrl: '/media/cover.jpg' } }),
  })
  renderApp('/barber/profile')
  const user = userEvent.setup()

  expect(await screen.findByText(/Χωρίς δικό σου εξώφυλλο, οι πελάτες βλέπουν αυτό/)).toBeInTheDocument()
  await user.upload(screen.getByLabelText('Εξώφυλλο'), new File(['x'], 'shop.jpg', { type: 'image/jpeg' }))

  await vi.waitFor(() => expect(calls.some((c) => c.key === 'PUT /barbers/me/cover')).toBe(true))
  expect(await screen.findByRole('button', { name: 'Αλλαγή εξωφύλλου' })).toBeInTheDocument()
})
