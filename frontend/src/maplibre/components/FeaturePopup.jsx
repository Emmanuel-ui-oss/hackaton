import { Popup } from "react-map-gl/maplibre"

export default function FeaturePopup({ selectedFeature, onClose }) {
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
            <div className="map-popup__title">{(selectedFeature.properties.tipo || "").replace(/_/g, " ")}</div>
            <div className="map-popup__body">
              {selectedFeature.properties.descripcion && <div style={{ marginBottom: 4 }}>{selectedFeature.properties.descripcion}</div>}
              {selectedFeature.properties.ubicacion_texto && <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.ubicacion_texto}</div>}
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
        {selectedFeature.type === "parada" && (
          <>
            <div className="map-popup__title">{selectedFeature.properties.nombre}</div>
            <div className="map-popup__body">
              <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.linea}{selectedFeature.properties.orden > 0 ? ` · Parada #${selectedFeature.properties.orden}` : ""}</div>
            </div>
          </>
        )}
        {selectedFeature.type === "linea" && (
          <>
            <div className="map-popup__title">{selectedFeature.properties.linea}</div>
            <div className="map-popup__body">
              <div style={{ fontSize: 11, opacity: 0.7 }}>Línea de transporte</div>
            </div>
          </>
        )}
        {selectedFeature.type === "sos" && (
          <>
            <div className="map-popup__title">🆘 SOS</div>
            <div className="map-popup__body">
              <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.nombre_completo}</div>
              {selectedFeature.properties.creado && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{new Date(selectedFeature.properties.creado).toLocaleString()}</div>}
            </div>
          </>
        )}
      </div>
    </Popup>
  )
}
