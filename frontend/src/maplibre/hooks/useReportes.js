import api from "../../services/api";
import usePageData from "../../hooks/usePageData";

const TIPO_COLORS = { accidente: "#ff1744", bloqueo: "#ffab00", zona_peligrosa: "#d500f9", robo: "#ff1744", clima: "#00bcd4", otro: "#9e9e9e" };
const TIPO_EMOJI  = { accidente: "🚗", bloqueo: "🚧", zona_peligrosa: "⚠️", robo: "💰", clima: "🌊", otro: "📍" };

function toGeoJSON(data) {
    const features = (data || []).filter(r => r.activo !== false).map(r => ({
        type: "Feature",
        properties: { id: r.id, tipo: r.tipo, descripcion: r.descripcion, usuario: r.usuario_username, emoji: TIPO_EMOJI[r.tipo] || "📍", ubicacion_texto: r.ubicacion_texto || "", votos_positivos: r.votos_positivos || 0, votos_negativos: r.votos_negativos || 0, creado: r.creado || "", color: TIPO_COLORS[r.tipo] || "#9e9e9e" },
        geometry: { type: "Point", coordinates: [r.longitud, r.latitud] },
    }));
    return { type: "FeatureCollection", features };
}

export default function useReportes(active) {
    const { data, loading } = usePageData(() => api.get("/api/v1/reportes"), active, toGeoJSON);
    return { data, loading };
}
