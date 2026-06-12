import { useMemo } from 'react'
import analyzeRouteRisk from '../services/analyzeRouteRisk'

export default function useRouteRisk(routeCoords, zonasFC, enabled = true, puntosRiesgo) {
  const analysis = useMemo(() => {
    if (!enabled || !routeCoords || (!zonasFC && !puntosRiesgo?.length)) {
      return { segments: [], geoJson: null }
    }
    return analyzeRouteRisk(routeCoords, zonasFC, puntosRiesgo)
  }, [routeCoords, zonasFC, puntosRiesgo, enabled])

  return analysis
}
