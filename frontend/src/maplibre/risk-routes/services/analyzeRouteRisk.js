import { splitByDistance, avgRiskForCoords, getRiskLevel } from '../utils/geoUtils'
import { getColorByLevel, getOpacityByLevel } from '../utils/riskColors'

export default function analyzeRouteRisk(routeCoords, zonasFC, puntosRiesgo) {
  if (!routeCoords || routeCoords.length < 2 || (!zonasFC?.features?.length && !puntosRiesgo?.length)) {
    return { segments: [], geoJson: null }
  }

  const zonas = zonasFC?.features?.length
    ? zonasFC.features.map(f => ({
        latitud: f.properties.latitud ?? f.properties.lat ?? f.geometry?.coordinates?.[1],
        longitud: f.properties.longitud ?? f.properties.lng ?? f.properties.lon ?? f.geometry?.coordinates?.[0],
        radio_metros: f.properties.radio_metros || 200,
        nivel: f.properties.nivel || 'BAJO',
      }))
    : null

  const raw = splitByDistance(routeCoords)
  const segments = raw.map(coords => {
    const risk = avgRiskForCoords(coords, zonas, puntosRiesgo)
    const nivel = getRiskLevel(risk)
    return {
      coords,
      risk,
      nivel,
      color: getColorByLevel(nivel),
      opacity: getOpacityByLevel(nivel),
    }
  })

  const geoJson = {
    type: 'FeatureCollection',
    features: segments.map(seg => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: seg.coords.map(([lat, lng]) => [lng, lat]),
      },
      properties: {
        nivel: seg.nivel,
        color: seg.color,
        opacity: seg.opacity,
      },
    })),
  }

  return { segments, geoJson }
}
