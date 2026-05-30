const CACHE_NAME = 'visionvial-v1'
const STATIC_FILES = [
  '/',
  '/static/manifest.json',
  '/static/css/base.css',
  '/static/js/api.js',
  '/static/js/app.js',
  '/static/js/mapa.js',
  '/static/lib/leaflet/leaflet.js',
  '/static/lib/leaflet/leaflet.css',
  '/static/lib/leaflet/images/marker-icon.png',
  '/static/lib/leaflet/images/marker-shadow.png',
  '/static/img/icon-192.png',
  '/static/img/icon-512.png',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_FILES)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // API requests: Network First with cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Static files: Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
    })
  )
})
