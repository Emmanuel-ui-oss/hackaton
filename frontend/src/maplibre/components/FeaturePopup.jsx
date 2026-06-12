import { Popup } from "react-map-gl/maplibre"
import { Train, Bus_svg, CableCar_svg } from "../../icons"

const TIPO_LABEL = {
  accidente: 'Accidente',
  bloqueo: 'Vía bloqueada',
  zona_peligrosa: 'Zona peligrosa',
  robo: 'Robo / Hurtos',
  clima: 'Inundación / Clima',
  deslizamiento: 'Deslizamiento',
  manifestacion: 'Manifestación',
  otro: 'Otro',
}
const TIPO_EMOJI = {
  accidente: '🚗',
  bloqueo: '🚧',
  zona_peligrosa: '⚠️',
  robo: '💰',
  clima: '🌊',
  deslizamiento: '🏔️',
  manifestacion: '✊',
  otro: '📍',
}

const transportIcon = (tipo) => {
  switch (tipo) {
    case "metro": return Train
    case "bus": return Bus_svg
    case "metro_cable": return CableCar_svg
    default: return null
  }
}

export default function FeaturePopup({ selectedFeature, onClose, darkMode = true }) {
  if (!selectedFeature) return null

  return (
    <Popup
      longitude={selectedFeature.coordinates[0]}
      latitude={selectedFeature.coordinates[1]}
      onClose={onClose}
      closeButton={true}
      anchor="bottom"
      offset={10}
    >
      <div className="map-popup">
        {selectedFeature.type === "reporte" && (
          <>
            <div className="map-popup__title">
              {TIPO_EMOJI[selectedFeature.properties.tipo] || '📍'} {TIPO_LABEL[selectedFeature.properties.tipo] || selectedFeature.properties.tipo?.replace(/_/g, ' ')}
            </div>
            <div className="map-popup__body">
              {selectedFeature.properties.descripcion && <div style={{ marginBottom: 4 }}>{selectedFeature.properties.descripcion}</div>}
              {selectedFeature.properties.ubicacion_texto && <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.ubicacion_texto}</div>}
              {selectedFeature.properties.usuario && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>👤 {selectedFeature.properties.usuario}</div>}
              <div style={{ fontSize: 11, marginTop: 4 }}>👍{selectedFeature.properties.votos_positivos} 👎{selectedFeature.properties.votos_negativos}</div>
              {selectedFeature.properties.creado && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{new Date(selectedFeature.properties.creado).toLocaleString()}</div>}
            </div>
          </>
        )}
        {selectedFeature.type === "alerta" && (
          <>
            <div className="map-popup__title">⚠️ {selectedFeature.properties.nivel}</div>
            <div className="map-popup__body">
              <div style={{ marginBottom: 4 }}>{selectedFeature.properties.mensaje}</div>
              {(selectedFeature.properties.zona_nombre || selectedFeature.properties.comuna) && (
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {selectedFeature.properties.zona_nombre}{selectedFeature.properties.zona_nombre && selectedFeature.properties.comuna ? " · " : ""}{selectedFeature.properties.comuna}
                </div>
              )}
              {selectedFeature.properties.creado && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{new Date(selectedFeature.properties.creado).toLocaleString()}</div>}
            </div>
          </>
        )}
        {selectedFeature.type === "zona" && (
          <>
            <div className="map-popup__title">{selectedFeature.properties.nombre}</div>
            <div className="map-popup__body">
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{selectedFeature.properties.nivel} · {selectedFeature.properties.tipo_riesgo}</div>
              {selectedFeature.properties.comuna && <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{selectedFeature.properties.comuna}</div>}
              {selectedFeature.properties.descripcion && <div>{selectedFeature.properties.descripcion}</div>}
              {selectedFeature.properties.radio_metros > 0 && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Radio: {selectedFeature.properties.radio_metros}m</div>}
            </div>
          </>
        )}
        {selectedFeature.type === "favorito" && (
          <>
            <div className="map-popup__title">{selectedFeature.properties.nombre}</div>
            {selectedFeature.properties.direccion && <div className="map-popup__body">{selectedFeature.properties.direccion}</div>}
          </>
        )}
        {selectedFeature.type === "ruta" && (
          <>
            <div className="map-popup__title">
              <span style={Object.assign({
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: "50%",
                marginRight: 8, verticalAlign: "middle",
              }, darkMode ? {
                backgroundColor: selectedFeature.properties.color,
                color: "#fff",
              } : {
                backgroundColor: "#fff",
                border: "2px solid " + selectedFeature.properties.color,
                color: "#000",
              })}>
                {transportIcon(selectedFeature.properties.tipo)}
              </span>
              {selectedFeature.properties.nombre}
            </div>
            <div className="map-popup__body">
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{selectedFeature.properties.tipo.replace("_", " ")} · {selectedFeature.properties.codigo}</div>
            </div>
          </>
        )}
        {selectedFeature.type === "parada" && (
          <>
            <div className="map-popup__title">
              <span style={Object.assign({
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: "50%",
                marginRight: 8, verticalAlign: "middle",
              }, darkMode ? {
                backgroundColor: selectedFeature.properties.color,
                color: "#fff",
              } : {
                backgroundColor: "#fff",
                border: "2px solid " + selectedFeature.properties.color,
                color: "#000",
              })}>
                {transportIcon(selectedFeature.properties.tipo)}
              </span>
              {selectedFeature.properties.nombre}
            </div>
            <div className="map-popup__body">
              <div style={{ fontSize: 12, marginBottom: 4 }}>Parada #{selectedFeature.properties.orden}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.linea_nombre}</div>
            </div>
          </>
        )}
      </div>
    </Popup>
  )
}
