// Service Worker for Offline Support
const CACHE_NAME = 'remodoc-v1'
const urlsToCache = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/offline'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // If both fail, show offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline')
        }
      })
  )
})

