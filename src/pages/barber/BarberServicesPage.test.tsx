import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { logInAs, mockApi, renderApp } from '../../test/render'

afterEach(() => vi.restoreAllMocks())

const haircut = { id: 1, name: 'Κούρεμα', description: 'Μόνο μαλλί', durationMinutes: 30, price: 12, kind: 'MAIN', active: true }
const wash = { id: 2, name: 'Λούσιμο', description: null, durationMinutes: 10, price: 0, kind: 'EXTRA', active: true }

it('splits main services from extras and suggests what to add', async () => {
  logInAs('nikos@test.gr', 'BARBER')
  const calls = mockApi({
    'GET /barbers/me/services': () => ({ json: [haircut, wash] }),
    'POST /barbers/me/services': () => ({ status: 201, json: { ...wash, id: 3, name: 'Σχέδια', price: 5 } }),
  })
  renderApp('/barber/services')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: 'Κύριες υπηρεσίες' })).toBeInTheDocument()
  expect(screen.getByText(/«Κούρεμα \+ μούσι»/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Έξτρα' })).toBeInTheDocument()
  expect(screen.getByText('Δωρεάν')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '+ Έξτρα' }))
  expect(screen.getByPlaceholderText('π.χ. Λούσιμο')).toBeInTheDocument()
  await user.type(screen.getByLabelText('Όνομα'), 'Σχέδια')
  await user.type(screen.getByLabelText('Τιμή (€)'), '5')
  await user.click(screen.getByRole('button', { name: 'Αποθήκευση' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key === 'POST /barbers/me/services')?.body).toMatchObject({ name: 'Σχέδια', price: 5, kind: 'EXTRA' }),
  )
})
