import { useEffect } from "react";
import usePageData from "../../hooks/usePageData";

const TIPO_NORMALIZE = {
  ACCIDENTE: 'accidente',
  BLOQUEO: 'bloqueo',
  ZONA_PELIGROSA: 'zona_peligrosa',
  ROBO: 'robo',
  INUNDACION: 'clima',
  DESLIZAMIENTO: 'deslizamiento',
  MANIFESTACION: 'manifestacion',
  OTRO: 'otro',
}
const TIPO_COLORS = { accidente: "#ff1744", bloqueo: "#ffab00", zona_peligrosa: "#d500f9", robo: "#ff1744", clima: "#00bcd4", deslizamiento: "#8d6e63", manifestacion: "#e040fb", otro: "#9e9e9e" };
const TIPO_EMOJI  = { accidente: "🚗", bloqueo: "🚧", zona_peligrosa: "⚠️", robo: "💰", clima: "🌊", deslizamiento: "🏔️", manifestacion: "✊", otro: "📍" };

function toGeoJSON(data) {
    const features = (data || []).filter(r => r.activo !== false).map(r => {
        const tipo = TIPO_NORMALIZE[r.tipo] || r.tipo?.toLowerCase() || 'otro'
        return {
            type: "Feature",
            properties: { id: r.id, tipo, descripcion: r.descripcion, usuario: r.usuario_username, emoji: TIPO_EMOJI[tipo] || "📍", ubicacion_texto: r.ubicacion_texto || "", votos_positivos: r.votos_positivos || 0, votos_negativos: r.votos_negativos || 0, creado: r.creado || "", color: TIPO_COLORS[tipo] || "#9e9e9e" },
        geometry: { type: "Point", coordinates: [r.longitud, r.latitud] },
        };
    });
    return { type: "FeatureCollection", features };
}

export default function useReportes(active) {
    const { data, loading, invalidate } = usePageData("/api/v1/reportes", active, toGeoJSON);

    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => invalidate(), 30000);
        return () => clearInterval(id);
    }, [active, invalidate]);

    return { data, loading };
}
