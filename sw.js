self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('app-cache').then(async cache => {
      const cached = await cache.match(event.request)
      if (cached) return cached

      const response = await fetch(event.request)
      cache.put(event.request, response.clone())
      return response
    })
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request)
    })
  )
})
