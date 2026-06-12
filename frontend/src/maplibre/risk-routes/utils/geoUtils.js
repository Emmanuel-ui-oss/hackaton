const SEGMENT_METERS = 150
const WEIGHTS = { CRITICO: 0.9, ALTO: 0.6, MEDIO: 0.35, BAJO: 0.1 }

export function haversine(a, b) {
  const R = 6371000
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLng = (b[1] - a[1]) * Math.PI / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const s = sinDLat * sinDLat + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function splitByDistance(coords, maxMeters = SEGMENT_METERS) {
  if (!coords || coords.length < 2) return []

  const segments = []
  let current = [coords[0]]
  let acc = 0

  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1], coords[i])
    acc += d
    current.push(coords[i])

    if (acc >= maxMeters || i === coords.length - 1) {
      segments.push(current)
      current = [coords[i]]
      acc = 0
    }
  }

  if (current.length > 1) {
    segments.push(current)
  }

  return segments
}

export function avgRiskForCoords(segCoords, zonas, puntosRiesgo) {
  if (!segCoords?.length) return 0
  if (!zonas?.length && !puntosRiesgo?.length) return 0

  let maxRisk = 0

  for (const [lat, lng] of segCoords) {
    if (zonas) {
      for (const z of zonas) {
        const d = distKm(lat, lng, z.latitud, z.longitud)
        const radio = (z.radio_metros || 500) / 1000
        if (d < radio) {
          maxRisk = Math.max(maxRisk, WEIGHTS[z.nivel] || 0.2)
        }
      }
    }

    if (puntosRiesgo) {
      for (const p of puntosRiesgo) {
        const d = distKm(lat, lng, p.latitud, p.longitud)
        const radio = (p.radio_impacto || 200) / 1000
        if (d < radio) {
          maxRisk = Math.max(maxRisk, p.peso || 0.2)
        }
      }
    }
  }
  return maxRisk
}

export function getRiskLevel(riskValue) {
  if (riskValue >= 0.7) return 'CRITICO'
  if (riskValue >= 0.4) return 'ALTO'
  if (riskValue >= 0.2) return 'MEDIO'
  return 'BAJO'
}

export function findClosestIdx(coords, lat, lng) {
  let minD = Infinity, idx = 0
  for (let i = 0; i < coords.length; i++) {
    const d = distKm(coords[i][0], coords[i][1], lat, lng)
    if (d < minD) { minD = d; idx = i }
  }
  return idx
}

export function offsetPerpendicular(coords, idx, offsetMeters, dangerCenter) {
  const i = Math.max(1, Math.min(idx, coords.length - 2))
  const dx = coords[i + 1][1] - coords[i - 1][1]
  const dy = coords[i + 1][0] - coords[i - 1][0]
  const angle = Math.atan2(dy, dx)
  const perp = angle + Math.PI / 2
  const offsetDegLat = offsetMeters / 111320
  const offsetDegLng = offsetMeters / (111320 * Math.cos(coords[i][0] * Math.PI / 180))

  const c1 = [coords[i][0] + offsetDegLat * Math.sin(perp), coords[i][1] + offsetDegLng * Math.cos(perp)]
  const c2 = [coords[i][0] - offsetDegLat * Math.sin(perp), coords[i][1] - offsetDegLng * Math.cos(perp)]

  const d1 = distKm(c1[0], c1[1], dangerCenter[0], dangerCenter[1])
  const d2 = distKm(c2[0], c2[1], dangerCenter[0], dangerCenter[1])
  return d1 > d2 ? c1 : c2
}

export function mergeClose(waypoints, minKm = 0.3) {
  const result = []
  for (const wp of waypoints) {
    const exists = result.some(r => distKm(r[0], r[1], wp[0], wp[1]) < minKm)
    if (!exists) result.push(wp)
  }
  return result
}
