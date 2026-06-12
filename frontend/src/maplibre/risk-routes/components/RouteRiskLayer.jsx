import { Source, Layer } from 'react-map-gl/maplibre'

export default function RouteRiskLayer({ geoJson, routeType }) {
  if (!geoJson || !geoJson.features?.length) return null

  const prefix = routeType === 'safe' ? 'route-safe-risk' : 'route-fast-risk'

  return (
    <Source id={`${prefix}-source`} type="geojson" data={geoJson}>
      <Layer
        id={`${prefix}-glow`}
        type="line"
        paint={{
          'line-color': ['get', 'color'],
          'line-width': 14,
          'line-opacity': 0.2,
          'line-blur': 4,
        }}
      />
      <Layer
        id={`${prefix}-line`}
        type="line"
        paint={{
          'line-color': ['get', 'color'],
          'line-width': 6,
          'line-opacity': 0.7,
          'line-blur': 0.5,
        }}
      />
    </Source>
  )
}
