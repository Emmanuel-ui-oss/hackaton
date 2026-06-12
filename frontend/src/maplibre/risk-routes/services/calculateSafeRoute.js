import { findClosestIdx, mergeClose, distKm } from '../utils/geoUtils'

const OSRM_BASE = 'https://router.project-osrm.org'

function puntoAdelante(coords, startIdx, meters) {
  let acc = 0
  for (let i = startIdx + 1; i < coords.length; i++) {
    acc += distKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]) * 1000
    if (acc >= meters) return { punto: coords[i], idx: i }
  }
  return { punto: coords[coords.length - 1], idx: coords.length - 1 }
}

export default async function calculateSafeRoute(origin, dest, routeCoords, puntosRiesgo) {
  const peligros = (puntosRiesgo || []).filter(p => p.nivel === 'critico' || p.nivel === 'alto')
  if (!peligros.length) return null

  const MAX_DETECT_KM = 0.5
  const MAX_WAYPOINTS = 2
  const AHEAD_METERS = 200
  const waypoints = []

  for (const p of peligros) {
    if (waypoints.length >= MAX_WAYPOINTS) break
    const idx = findClosestIdx(routeCoords, p.latitud, p.longitud)
    const d = distKm(routeCoords[idx][0], routeCoords[idx][1], p.latitud, p.longitud)
    const radioKm = Math.min(p.radio_impacto || 200, MAX_DETECT_KM * 1000) / 1000
    if (d < radioKm) {
      const { punto } = puntoAdelante(routeCoords, idx, AHEAD_METERS)
      waypoints.push(punto)
    }
  }

  const unicos = mergeClose(waypoints, 0.3)
  if (!unicos.length) return null

  const viaPoints = unicos.slice(0, MAX_WAYPOINTS)
  const osrmPoints = [[origin[1], origin[0]], ...viaPoints.map(([lat, lng]) => [lng, lat]), [dest[1], dest[0]]]
  const coordsStr = osrmPoints.map(p => `${p[0]},${p[1]}`).join(';')

  try {
    const res = await fetch(
      `${OSRM_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) return null

    const newCoords = route.geometry.coordinates
    const same = newCoords.length === routeCoords.length &&
      distKm(newCoords[0][1], newCoords[0][0], routeCoords[0][0], routeCoords[0][1]) < 0.001 &&
      distKm(newCoords[newCoords.length - 1][1], newCoords[newCoords.length - 1][0], routeCoords[routeCoords.length - 1][0], routeCoords[routeCoords.length - 1][1]) < 0.001
    if (same) return null

    return {
      geometry: { type: 'LineString', coordinates: newCoords },
      coords: newCoords.map(([lng, lat]) => [lat, lng]),
      distance: route.distance,
      duration: route.duration,
      steps: extraerStepsOSRM(route),
    }
  } catch {
    return null
  }
}

function extraerStepsOSRM(route) {
  const legs = route.legs ?? []
  for (const leg of legs) {
    const rawSteps = leg.steps ?? []
    if (rawSteps.length > 0) {
      return rawSteps
        .filter(s => s.maneuver?.type !== 'depart' && s.maneuver?.type !== 'arrive' || rawSteps.length <= 2)
        .map(s => ({
          distancia: s.distance ?? 0,
          nombre: s.name ?? '',
          tipo: s.maneuver?.type ?? 'turn',
          modificador: s.maneuver?.modifier ?? '',
          bearing: s.maneuver?.bearing_after ?? null,
          punto: s.maneuver?.location ?? null,
          exit: s.maneuver?.exit ?? null,
        }))
        .filter(s => s.distancia > 0 || s.nombre)
    }
  }
  return []
}
