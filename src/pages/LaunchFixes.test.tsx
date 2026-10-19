import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fakeToken, logInAs, mockApi, renderApp } from '../test/render'

const maria = { id: 1, name: 'Maria', email: 'maria@test.gr', phoneNumber: null, role: 'CUSTOMER' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:00:00Z'))
})
afterEach(() => vi.useRealTimers())

it('lets people add their mobile and change their name', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  const calls = mockApi({
    'GET /users/me': () => ({ json: maria }),
    'PUT /users/me': () => ({ json: { ...maria, name: 'Maria P.', phoneNumber: '6912345678' } }),
  })
  renderApp('/account')
  const user = userEvent.setup()

  expect(await screen.findByText(/Πρόσθεσε το κινητό σου/)).toBeInTheDocument()
  const name = screen.getByLabelText('Όνομα')
  await user.clear(name)
  await user.type(name, 'Maria P.')
  await user.type(screen.getByLabelText('Κινητό'), '69 1234 5678')
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση' }))

  expect(await screen.findByText('Τα στοιχεία αποθηκεύτηκαν.')).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'PUT /users/me')?.body).toEqual({ name: 'Maria P.', phoneNumber: '69 1234 5678' })
})

it('changes the password and keeps this device signed in', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  const calls = mockApi({
    'GET /users/me': () => ({ json: { ...maria, phoneNumber: '6900000000' } }),
    'POST /users/me/password': () => ({ json: { token: fakeToken('maria@test.gr', 'CUSTOMER') } }),
  })
  renderApp('/account')
  const user = userEvent.setup()

  await user.type(await screen.findByLabelText('Τωρινός κωδικός'), 'old-secret-42')
  await user.type(screen.getByLabelText('Νέος κωδικός'), 'brand-new-secret')
  await user.type(screen.getByLabelText('Ξανά ο νέος κωδικός'), 'brand-new-secret')
  await user.click(screen.getByRole('button', { name: 'Αλλαγή κωδικού' }))

  expect(await screen.findByText(/Ο κωδικός άλλαξε/)).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'POST /users/me/password')?.body).toEqual({
    currentPassword: 'old-secret-42',
    newPassword: 'brand-new-secret',
  })
  expect(screen.getByRole('heading', { name: 'Λογαριασμός' })).toBeInTheDocument()
})
