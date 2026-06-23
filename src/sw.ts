/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Precache the built app shell (manifest injected by vite-plugin-pwa at build time).
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

// Show a notification when a push arrives (friend posted / daily reminder).
self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    if (event.data) payload = event.data.json() as PushPayload
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = payload.title ?? 'GoodEats'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: payload.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Focus an existing window (or open one) when the notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        return self.clients.openWindow(targetUrl)
      }),
  )
})
