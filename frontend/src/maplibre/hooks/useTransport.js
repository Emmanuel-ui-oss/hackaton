import api from "../../services/api";
import usePageData from "../../hooks/usePageData";

function toGeoJSON(data) {
  const features = [];
  (data || []).forEach(r => {
    if (r.ruta_geojson && r.ruta_geojson.length > 0) {
      features.push({
        type: "Feature",
        properties: { id: r.id, nombre: r.nombre, tipo: r.tipo, codigo: r.codigo, color: r.color },
        geometry: { type: "LineString", coordinates: r.ruta_geojson },
      });
    }
    (r.paradas || []).forEach(p => {
      features.push({
        type: "Feature",
        properties: { id: p.id, nombre: p.nombre, orden: p.orden, tipo: r.tipo, linea_nombre: r.nombre, linea_color: r.color, linea_codigo: r.codigo },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      });
    });
  });
  return { type: "FeatureCollection", features };
}

export default function useTransport(active) {
  const { data, loading } = usePageData(() => api.get("/api/v1/transport"), active, toGeoJSON);
  return { data, loading };
}
