import { Marker } from "react-map-gl/maplibre"

export default function MapSOSMarkers({ sos, onSOSClick }) {
  if (!sos?.data?.features) return null

  return sos.data.features.map(f => (
    <Marker
      key={f.properties.id}
      longitude={f.geometry.coordinates[0]}
      latitude={f.geometry.coordinates[1]}
      anchor="center"
    >
      <div
        className="sos-map-marker"
        onClick={() => onSOSClick({
          type: "sos",
          properties: f.properties,
          coordinates: f.geometry.coordinates,
        })}
      >
        <div className="sos-map-pulse"></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff1744" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    </Marker>
  ))
}
