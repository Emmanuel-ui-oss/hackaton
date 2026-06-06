import api from "../../services/api";
import usePageData from "../../hooks/usePageData";

const NIVEL_COLORS = { CRITICO: "#ff1744", ALTO: "#ffab00", MEDIO: "#2979ff", BAJO: "#00c853" };

function toGeoJSON(data) {
    const features = (data || []).map(a => ({
        type: "Feature",
        properties: { id: a.id, mensaje: a.mensaje, nivel: a.nivel, leida: a.leida, zona_nombre: a.zona_riesgo?.nombre || "", comuna: a.zona_riesgo?.comuna || "", creado: a.creado || "" },
        geometry: { type: "Point", coordinates: [a.zona_riesgo?.longitud || -75.5636, a.zona_riesgo?.latitud || 6.2518] },
        color: NIVEL_COLORS[a.nivel] || "#888",
        nivel: a.nivel,
    }));
    return { type: "FeatureCollection", features };
}

export default function useAlertas(active) {
    const { data, loading } = usePageData(() => api.get("/api/v1/alertas"), active, toGeoJSON);
    return { data, loading };
}
