import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { fakeToken, logInAs, mockApi, renderApp } from '../../test/render'

afterEach(() => vi.unstubAllGlobals())

const pending = {
  id: 2, userId: 10, name: 'Barber Nick', email: 'nick@test.gr', phoneNumber: '6900000000', specialty: 'Fade',
  address: 'Ερμού 12', city: 'Αθήνα', shopName: null, status: 'PENDING', createdAt: '2026-10-12T09:00:00Z',
}

it('lets an admin approve a pending barber', async () => {
  logInAs('admin@test.gr', 'ADMIN')
  let approved = false
  const calls = mockApi({
    'GET /admin/barbers?status=PENDING': () => ({ json: approved ? [] : [pending] }),
    'PATCH /admin/barbers/2/status': (body) => {
      approved = true
      return { json: { ...pending, ...(body as object) } }
    },
  })
  renderApp('/admin')
  const user = userEvent.setup()

  expect(await screen.findByRole('heading', { name: 'Barber Nick' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Σε αναμονή · 1' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('link', { name: '6900000000' })).toHaveAttribute('href', 'tel:6900000000')

  await user.click(screen.getByRole('button', { name: 'Έγκριση' }))

  expect(await screen.findByText(/εγκρίθηκε και εμφανίζεται/)).toBeInTheDocument()
  expect(await screen.findByText('Κανένας barber δεν περιμένει έγκριση.')).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'PATCH /admin/barbers/2/status')?.body).toEqual({ status: 'APPROVED' })
})

it('sends admins to approvals after login', async () => {
  mockApi({
    'POST /auth/login': () => ({ json: { token: fakeToken('admin@test.gr', 'ADMIN') } }),
    'GET /admin/barbers?status=PENDING': () => ({ json: [] }),
  })
  renderApp('/login')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'admin@test.gr')
  await user.type(screen.getByLabelText('Κωδικός'), 'pass1234')
  await user.click(screen.getByRole('button', { name: 'Σύνδεση' }))

  expect(await screen.findByRole('tab', { name: 'Σε αναμονή' })).toBeInTheDocument()
})

it('keeps non-admins out', async () => {
  logInAs('maria@test.gr', 'CUSTOMER')
  mockApi({ 'GET /barbers': () => ({ json: [] }) })
  renderApp('/admin')

  expect(await screen.findByRole('heading', { name: 'Βρες barber' })).toBeInTheDocument()
})
