import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../test/render'

afterEach(() => vi.unstubAllGlobals())

it('requires accepting the terms to sign up and sends the acceptance', async () => {
  const calls = mockApi({ 'POST /auth/register': () => ({ json: { id: 1, name: 'Maria', email: 'maria@test.gr', phoneNumber: null, role: 'CUSTOMER' } }) })
  renderApp('/register')
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Όνομα'), 'Maria')
  await user.type(screen.getByLabelText('Email'), 'maria@test.gr')
  await user.type(screen.getByLabelText('Κωδικός'), 'three-words-here')
  await user.type(screen.getByLabelText('Επιβεβαίωση κωδικού'), 'three-words-here')
  const submit = screen.getByRole('button', { name: 'Δημιουργία λογαριασμού' })
  expect(submit).toBeDisabled()

  await user.click(screen.getByRole('checkbox', { name: /αποδέχομαι τους Όρους χρήσης/ }))
  await user.click(submit)

  await vi.waitFor(() => expect(calls[0]?.body).toMatchObject({ acceptTerms: true, role: 'CUSTOMER' }))
})

it('deletes the account after the password is confirmed, then signs out', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  const calls = mockApi({
    'DELETE /users/me': () => ({ status: 204 }),
    'GET /barbers': () => ({ json: [] }),
  })
  renderApp('/account')
  const user = userEvent.setup()

  expect(screen.getByText('maria@test.gr')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Θέλω να διαγράψω τον λογαριασμό μου' }))
  await user.type(screen.getByLabelText('Γράψε τον κωδικό σου για επιβεβαίωση'), 'my-password')
  await user.click(screen.getByRole('button', { name: 'Οριστική διαγραφή' }))

  expect(await screen.findByText('Ο λογαριασμός σου διαγράφηκε.')).toBeInTheDocument()
  expect(calls[0]).toMatchObject({ key: 'DELETE /users/me', body: { password: 'my-password' } })
  expect(await screen.findByRole('link', { name: 'Σύνδεση' })).toBeInTheDocument()
})

it('explains a wrong password without deleting', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  mockApi({ 'DELETE /users/me': () => ({ status: 400, json: { detail: 'Wrong password' } }) })
  renderApp('/account')
  const user = userEvent.setup()

  await user.click(screen.getByRole('button', { name: 'Θέλω να διαγράψω τον λογαριασμό μου' }))
  await user.type(screen.getByLabelText('Γράψε τον κωδικό σου για επιβεβαίωση'), 'nope')
  await user.click(screen.getByRole('button', { name: 'Οριστική διαγραφή' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Λάθος κωδικός.')
})

it('shows a clear message when there were too many attempts', async () => {
  mockApi({ 'POST /auth/login': () => ({ status: 429, json: { detail: 'Too many attempts', code: 'RATE_LIMITED' } }) })
  renderApp('/login')
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Email'), 'maria@test.gr')
  await user.type(screen.getByLabelText('Κωδικός'), 'pass1234')
  await user.click(screen.getByRole('button', { name: 'Σύνδεση' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Πολλές προσπάθειες')
})

it('links to the terms and privacy policy from every page', async () => {
  mockApi({ 'GET /barbers': () => ({ json: [] }) })
  renderApp('/')
  const user = userEvent.setup()

  await user.click(screen.getByRole('link', { name: 'Απόρρητο' }))
  expect(await screen.findByRole('heading', { name: 'Πολιτική απορρήτου' })).toBeInTheDocument()
  expect(screen.getByText(/Αρχή Προστασίας Δεδομένων/)).toBeInTheDocument()
})
