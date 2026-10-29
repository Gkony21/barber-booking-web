import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import '../../i18n'
import { logInAs, mockApi } from '../../test/render'
import { NotificationsCard } from './NotificationsCard'

const KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const subscriptionJson = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } }

// A browser that can receive notifications, with a service worker in place.
function pushBrowser(permission: NotificationPermission = 'default') {
  let current: unknown = null
  const subscription = { endpoint: subscriptionJson.endpoint, toJSON: () => subscriptionJson, unsubscribe: vi.fn(async () => true) }
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => (current = subscription)),
  }
  vi.stubGlobal('PushManager', function PushManager() {})
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn(async () => 'granted') })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => ({ pushManager })) },
  })
  return pushManager
}

function renderCard(props = {}) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <NotificationsCard {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => logInAs('giorgos@test.gr', 'BARBER'))
afterEach(() => {
  vi.unstubAllGlobals()
  delete (navigator as { serviceWorker?: unknown }).serviceWorker
  vi.restoreAllMocks()
})

it('turns notifications on for this phone and sends a test one', async () => {
  const pushManager = pushBrowser()
  const calls = mockApi({
    'GET /push/key': () => ({ json: { publicKey: KEY } }),
    'POST /push/subscriptions': () => ({ status: 204 }),
    'POST /push/test': () => ({ json: { delivered: 1 } }),
  })
  renderCard()
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Ενεργοποίηση ειδοποιήσεων' }))
  expect(await screen.findByText(/Ενεργές σε αυτή τη συσκευή/)).toBeInTheDocument()
  expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
  expect(calls.find((c) => c.key === 'POST /push/subscriptions')?.body).toEqual(subscriptionJson)

  await user.click(screen.getByRole('button', { name: 'Δοκιμή' }))
  expect(await screen.findByText('Στάλθηκε. Θα τη δεις σε λίγα δευτερόλεπτα.')).toBeInTheDocument()
})

it('tells iPhone users to put FADE on the home screen first', async () => {
  pushBrowser()
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
  mockApi({ 'GET /push/key': () => ({ json: { publicKey: KEY } }) })
  renderCard()

  expect(await screen.findByText(/Προσθήκη στην οθόνη Αφετηρίας/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ενεργοποίηση ειδοποιήσεων' })).not.toBeInTheDocument()
})

it('stays out of the way where notifications are not set up, or already on in the schedule', async () => {
  pushBrowser()
  mockApi({ 'GET /push/key': () => ({ status: 404, json: { detail: 'Phone notifications are not set up' } }) })
  renderCard()
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
})
