/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Species JSON — long-lived static cache
registerRoute(
  ({ url }) => url.pathname.includes('/data/species.json'),
  new CacheFirst({
    cacheName: 'species-data',
    plugins: [new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 31_536_000 })],
  })
)

// SPA navigation fallback
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/__/],
  })
)

// ── Push notification handler ─────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as {
    title?: string; body?: string; tag?: string; url?: string
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'VivTrack', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag ?? 'vivtrack',
      data: { url: data.url ?? '/tasks' },
      requireInteraction: false,
    })
  )
})

// ── Notification click: focus or open the app ─────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url ?? '/tasks') as string
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes(url))
      if (match) return match.focus()
      return self.clients.openWindow(url)
    })
  )
})
