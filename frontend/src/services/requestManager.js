import api from './api'

const inflight = new Map()
const cache = new Map()
let activeCount = 0
const queue = []

const MAX_CONCURRENT = 6
const CACHE_TTL = 60000
const MAX_CACHE_ENTRIES = 200

function key(config) {
  const m = (config.method || 'get').toUpperCase()
  const p = JSON.stringify(config.params || {})
  const d = JSON.stringify(config.data || {})
  return `${m}:${config.url}:${p}:${d}`
}

function cacheHit(key, ttl) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts < ttl) return entry.data
  return { data: entry.data, stale: true }
}

function cacheSet(key, data, ttl) {
  cache.set(key, { data, ts: Date.now(), ttl })
  if (cache.size > MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value
    cache.delete(first)
  }
}

export function invalidateCache(pattern) {
  if (!pattern) { cache.clear(); return }
  for (const k of cache.keys()) { if (k.includes(pattern)) cache.delete(k) }
}

function processQueue() {
  if (!queue.length || activeCount >= MAX_CONCURRENT) return
  const idx = queue.findIndex(e => e.priority === 'critical')
  const entry = queue.splice(idx >= 0 ? idx : 0, 1)[0]
  entry?.resolve()
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchWithRetry(config, retries, signal, priority) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      if (activeCount >= MAX_CONCURRENT) {
        await new Promise(resolve => queue.push({ resolve, priority }))
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      }
      activeCount++
      try {
        const res = await api({ ...config, signal })
        return res.data !== undefined ? res.data : res
      } finally {
        activeCount--
        processQueue()
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err
      if (err.response && err.response.status < 500) throw err
      lastErr = err
      if (attempt >= retries) throw err
      await sleep(Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 10000))
    }
  }
  throw lastErr
}

function refreshBg(key, config, ttl) {
  fetchWithRetry(config, 1, null, 'background')
    .then(data => cacheSet(key, data, ttl))
    .catch(() => {})
}

export async function request(config, opts = {}) {
  const { ttl = CACHE_TTL, priority = 'normal', retries = 2, dedup = true, signal } = opts
  const isGet = !config.method || config.method.toUpperCase() === 'GET'
  const k = key(config)

  if (isGet) {
    const hit = cacheHit(k, ttl)
    if (hit && !hit.stale) return hit
    if (hit && hit.stale) { refreshBg(k, config, ttl); return hit.data }
  }

  if (isGet && dedup && inflight.has(k)) return inflight.get(k)

  const promise = fetchWithRetry(config, retries, signal, priority).then(data => {
    if (isGet) cacheSet(k, data, ttl)
    return data
  }).finally(() => { inflight.delete(k) })

  if (isGet && dedup) inflight.set(k, promise)
  return promise
}

export async function get(url, params, opts) {
  return request({ url, params, method: 'get' }, { ...opts, dedup: true })
}

export async function post(url, data, opts) {
  return request({ url, data, method: 'post' }, { ...opts, dedup: false })
}

export async function put(url, data, opts) {
  return request({ url, data, method: 'put' }, { ...opts, dedup: false })
}

export async function del(url, opts) {
  return request({ url, method: 'delete' }, { ...opts, dedup: false })
}
