import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

afterEach(() => vi.unstubAllGlobals())

const barber = {
  id: 4, name: 'Thanos', avatarUrl: null, bio: null, experienceYears: null, specialty: null, address: null, city: 'Αθήνα',
  status: 'APPROVED', autoConfirmBookings: true, shopId: null, shopName: null,
}

it('uploads work photos one by one and deletes them', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  let photos: { id: number; url: string }[] = [{ id: 1, url: '/media/a.jpg' }]
  const calls = mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/photos': () => ({ json: photos }),
    'POST /barbers/me/photos': () => {
      const photo = { id: photos.length + 1, url: `/media/${photos.length + 1}.jpg` }
      photos = [photo, ...photos]
      return { status: 201, json: photo }
    },
    'DELETE /barbers/me/photos/1': () => {
      photos = photos.filter((p) => p.id !== 1)
      return { status: 204 }
    },
  })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  renderApp('/barber/profile')
  const user = userEvent.setup()

  expect(await screen.findByText('1/20')).toBeInTheDocument()

  const files = [new File(['x'], 'one.jpg', { type: 'image/jpeg' }), new File(['y'], 'two.jpg', { type: 'image/jpeg' })]
  await user.upload(screen.getByLabelText('Προσθήκη φωτογραφιών'), files)

  expect(await screen.findByText('3/20')).toBeInTheDocument()
  const uploads = calls.filter((c) => c.key === 'POST /barbers/me/photos')
  expect(uploads).toHaveLength(2)
  expect((uploads[0].body as FormData).get('file')).toBeInstanceOf(Blob)

  const grid = screen.getByText('3/20').closest('section')!
  const deleteButtons = within(grid).getAllByRole('button', { name: 'Διαγραφή φωτογραφίας' })
  await user.click(deleteButtons[deleteButtons.length - 1])
  expect(await screen.findByText('2/20')).toBeInTheDocument()
})

it('stops offering uploads at 20 photos', async () => {
  logInAs('thanos@test.gr', 'BARBER')
  const twenty = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, url: `/media/${i}.jpg` }))
  mockApi({
    'GET /barbers/me': () => ({ json: barber }),
    'GET /barbers/me/photos': () => ({ json: twenty }),
  })
  renderApp('/barber/profile')

  expect(await screen.findByText(/Έφτασες τις 20 φωτογραφίες/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Προσθήκη φωτογραφιών/ })).not.toBeInTheDocument()
})
