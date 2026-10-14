import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderApp } from '../test/render'

afterEach(() => vi.unstubAllGlobals())

async function fillRegistration(password: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Όνομα'), 'Maria')
  await user.type(screen.getByLabelText('Email'), 'maria@test.gr')
  await user.type(screen.getByLabelText('Κωδικός'), password)
  await user.type(screen.getByLabelText('Επιβεβαίωση κωδικού'), confirm)
  await user.click(screen.getByRole('checkbox', { name: /αποδέχομαι τους Όρους χρήσης/ }))
  return user
}

it('asks for the password twice and blocks sign-up until both match', async () => {
  mockApi({})
  renderApp('/register')

  const user = await fillRegistration('three-words-here', 'three-words-hear')

  expect(screen.getByText('Οι δύο κωδικοί δεν είναι ίδιοι.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Δημιουργία λογαριασμού' })).toBeDisabled()

  await user.clear(screen.getByLabelText('Επιβεβαίωση κωδικού'))
  await user.type(screen.getByLabelText('Επιβεβαίωση κωδικού'), 'three-words-here')
  expect(screen.getByRole('button', { name: 'Δημιουργία λογαριασμού' })).toBeEnabled()
})

it('can show the password while typing', async () => {
  mockApi({})
  renderApp('/register')
  const user = userEvent.setup()

  const field = screen.getByLabelText('Κωδικός')
  expect(field).toHaveAttribute('type', 'password')
  await user.click(screen.getAllByRole('button', { name: 'Εμφάνιση κωδικού' })[0])
  expect(field).toHaveAttribute('type', 'text')
})

it('explains a password that is too easy to guess', async () => {
  mockApi({ 'POST /auth/register': () => ({ status: 400, json: { detail: 'This password is too common', code: 'WEAK_PASSWORD' } }) })
  renderApp('/register')

  const user = await fillRegistration('olympiakos7', 'olympiakos7')
  await user.click(screen.getByRole('button', { name: 'Δημιουργία λογαριασμού' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('μαντεύεται εύκολα')
})

it('sends a reset link from the login page without revealing whether the account exists', async () => {
  const calls = mockApi({ 'POST /auth/forgot-password': () => ({ status: 202 }) })
  renderApp('/login')
  const user = userEvent.setup()

  await user.click(screen.getByRole('link', { name: 'Ξέχασες τον κωδικό;' }))
  await user.type(screen.getByLabelText('Email'), 'maria@test.gr')
  await user.click(screen.getByRole('button', { name: 'Στείλε μου σύνδεσμο' }))

  expect(await screen.findByText(/Αν υπάρχει λογαριασμός με αυτό το email/)).toBeInTheDocument()
  expect(calls[0]).toMatchObject({ key: 'POST /auth/forgot-password', body: { email: 'maria@test.gr' } })
})

it('sets a new password from the emailed link', async () => {
  const calls = mockApi({ 'POST /auth/reset-password': () => ({ status: 204 }) })
  renderApp('/reset-password?token=abc')
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Νέος κωδικός'), 'fade-at-nine')
  await user.type(screen.getByLabelText('Επιβεβαίωση κωδικού'), 'fade-at-nine')
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση κωδικού' }))

  expect(await screen.findByRole('heading', { name: 'Ο κωδικός άλλαξε' })).toBeInTheDocument()
  expect(calls[0].body).toEqual({ token: 'abc', password: 'fade-at-nine' })
})

it('offers a new link when the old one has expired', async () => {
  mockApi({ 'POST /auth/reset-password': () => ({ status: 400, json: { detail: 'Invalid or expired reset link' } }) })
  renderApp('/reset-password?token=old')
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Νέος κωδικός'), 'fade-at-nine')
  await user.type(screen.getByLabelText('Επιβεβαίωση κωδικού'), 'fade-at-nine')
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση κωδικού' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('έληξε ή χρησιμοποιήθηκε')
  expect(screen.getByRole('link', { name: 'Ζήτα νέο σύνδεσμο' })).toHaveAttribute('href', '/forgot-password')
})
