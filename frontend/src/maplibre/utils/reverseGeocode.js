const MAX_ENTRIES = 100
const cache = new Map()

export default async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  if (cache.has(key)) return cache.get(key)

  try {
    const res = await fetch(
      `/api/v1/proxy/reverse-geocode?lat=${lat}&lng=${lng}`
    )
    const data = await res.json()
    if (!data || !data.road) return null

    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      cache.delete(oldest)
    }
    cache.set(key, data.road)
    return data.road
  } catch {
    return null
  }
}


