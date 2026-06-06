let cache = {}

export default async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  if (cache[key]) return cache[key]

  try {
    const res = await fetch(
      `/api/v1/proxy/reverse-geocode?lat=${lat}&lng=${lng}`
    )
    const data = await res.json()
    if (!data || !data.road) return null

    cache[key] = data.road
    return data.road
  } catch {
    return null
  }
}

export function clearGeocodeCache() {
  cache = {}
}
