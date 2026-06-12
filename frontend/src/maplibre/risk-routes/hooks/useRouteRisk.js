import { useMemo } from 'react'
import analyzeRouteRisk from '../services/analyzeRouteRisk'

export default function useRouteRisk(routeCoords, zonasFC, puntosRiesgo) {
  const analysis = useMemo(() => {
    if (!routeCoords || !zonasFC?.features?.length) {
      return { segments: [], geoJson: null }
    }
    return analyzeRouteRisk(routeCoords, zonasFC, puntosRiesgo)
  }, [routeCoords, zonasFC, puntosRiesgo])

  return analysis
}
