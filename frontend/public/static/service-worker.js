const CACHE_NAME = 'visionvial-v2'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Ignore map tiles (too many, change constantly)
  if (
    url.hostname.includes('cartocdn') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('tiles.mapbox')
  ) {
    return
  }

  // Ignore WebSocket
  if (url.pathname.startsWith('/ws/')) {
    return
  }

  // Network-first for HTML navigation and API calls
  if (request.mode === 'navigate' || url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(request))
    return
  }

  // Cache-first for everything else (assets, static, CDN CSS)
  e.respondWith(cacheFirst(request))
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(null, { status: 503 })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response(null, { status: 503 })
  }
}
