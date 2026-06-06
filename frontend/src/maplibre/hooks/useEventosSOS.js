import api from "../../services/api";
import usePageData from "../../hooks/usePageData";

function toGeoJSON(data) {
    const features = (data || []).filter(s => s.activo !== false).map(s => ({
        type: "Feature",
        properties: { id: s.id, activo: s.activo, usuario: s.usuario, creado: s.creado, nombre_completo: s.usuario?.nombre_completo || s.usuario?.username || "" },
        geometry: { type: "Point", coordinates: [s.longitud || -75.5636, s.latitud || 6.2518] },
    }));
    return { type: "FeatureCollection", features };
}

export default function useEventosSOS(active) {
    const { data, loading } = usePageData(() => api.get("/api/v1/sos"), active, toGeoJSON);
    return { data, loading };
}
