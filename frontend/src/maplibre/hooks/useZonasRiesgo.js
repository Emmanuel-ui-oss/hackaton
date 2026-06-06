import api from "../../services/api";
import usePageData from "../../hooks/usePageData";

const NIVEL_COLORS = { CRITICO: "#ff1744", ALTO: "#ffab00", MEDIO: "#2979ff", BAJO: "#00c853" };

function circlePolygon(lat, lng, radiusMeters, points = 48) {
    const coords = [];
    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const dx = radiusMeters * Math.cos(angle);
        const dy = radiusMeters * Math.sin(angle);
        const dLat = dy / 111320;
        const dLng = dx / (111320 * Math.cos((lat * Math.PI) / 180));
        coords.push([lng + dLng, lat + dLat]);
    }
    return coords;
}

function toGeoJSON(data) {
    const features = (data || []).map(z => {
        const nivel = z.nivel || "BAJO";
        const r = z.radio_metros || 200;
        const polygon = circlePolygon(z.latitud, z.longitud, r);
        return {
            type: "Feature",
            properties: { id: z.id, nombre: z.nombre, nivel, color: NIVEL_COLORS[nivel] || "#888", opacidad: nivel === "CRITICO" ? 0.2 : nivel === "ALTO" ? 0.18 : nivel === "MEDIO" ? 0.15 : 0.12, comuna: z.comuna || "", tipo_riesgo: z.tipo_riesgo || "", descripcion: z.descripcion || "", radio_metros: z.radio_metros || 0 },
            geometry: { type: "Polygon", coordinates: [polygon] },
        };
    });
    return { type: "FeatureCollection", features };
}

export default function useZonasRiesgo(active) {
    const { data, loading } = usePageData(() => api.get("/api/v1/zonas-riesgo"), active, toGeoJSON);
    return { data, loading };
}
