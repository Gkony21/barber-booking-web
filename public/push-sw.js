// Phone notifications, added to the app's service worker (see vite.config.ts, workbox.importScripts).
// The API sends { title, body, url }, encrypted for this browser; tapping opens that page in the app.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'FADE', {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      lang: 'el',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      if (open) return open.navigate(url).then((w) => (w || open).focus())
      return self.clients.openWindow(url)
    }),
  )
})
