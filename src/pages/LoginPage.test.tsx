import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { fakeToken, mockApi, renderApp } from '../test/render'

afterEach(() => vi.unstubAllGlobals())

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'maria@test.gr')
  await user.type(screen.getByLabelText('Κωδικός'), 'pass1234')
  await user.click(screen.getByRole('button', { name: 'Σύνδεση' }))
  return user
}

it('logs in and returns to the page the user came from', async () => {
  mockApi({
    'POST /auth/login': () => ({ json: { token: fakeToken('maria@test.gr', 'CUSTOMER') } }),
    'GET /appointments/me': () => ({ json: [] }),
  })
  renderApp('/login?next=/appointments')

  await fillAndSubmit()

  expect(await screen.findByRole('heading', { name: 'Τα ραντεβού μου' })).toBeInTheDocument()
})

it('shows a Greek message for wrong credentials', async () => {
  mockApi({ 'POST /auth/login': () => ({ status: 401, json: { detail: 'Invalid email or password' } }) })
  renderApp('/login')

  await fillAndSubmit()

  expect(await screen.findByRole('alert')).toHaveTextContent('Λάθος email ή κωδικός.')
})

it('offers to resend the verification email for unverified accounts', async () => {
  const calls = mockApi({
    'POST /auth/login': () => ({ status: 403, json: { detail: 'Please verify', code: 'EMAIL_NOT_VERIFIED' } }),
    'POST /auth/resend-verification': () => ({ status: 202 }),
  })
  renderApp('/login')

  const user = await fillAndSubmit()
  await user.click(await screen.findByRole('button', { name: 'Ξαναστείλε μου το email' }))

  expect(await screen.findByText(/σου στείλαμε νέο email/)).toBeInTheDocument()
  expect(calls.at(-1)).toMatchObject({ key: 'POST /auth/resend-verification', body: { email: 'maria@test.gr' } })
})
