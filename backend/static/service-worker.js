const CACHE_NAME = 'visionvial-v3'
const API_CACHE = 'visionvial-api-v3'

const PRECACHE_URLS = [
  '/',
  '/static/manifest.json',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
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

  // API calls: Network First with cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // HTML navigation: Network First
  if (request.mode === 'navigate') {
    e.respondWith(networkFirst(request, CACHE_NAME))
    return
  }

  // Static assets (JS, CSS, images): Cache First
  e.respondWith(cacheFirst(request, CACHE_NAME))
})

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(null, { status: 503 })
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response(null, { status: 503 })
  }
}
