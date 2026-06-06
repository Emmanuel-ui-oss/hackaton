import api from "../../services/api";
import usePageData from "../../hooks/usePageData";

function toGeoJSON(data) {
    const paradas = data || [];
    const features = [];

    const lines = {};
    paradas.forEach(p => {
        const key = p.linea_nombre || "unknown";
        if (!lines[key]) {
            lines[key] = {
                nombre: key, color: p.linea_color || "#00bcd4",
                tipo: p.linea_tipo || "BUS", ruta_geojson: p.linea_ruta_geojson,
                stops: [],
            };
        }
        lines[key].stops.push(p);
    });

    Object.values(lines).forEach(line => {
        const sorted = line.stops.sort((a, b) => (a.orden || 0) - (b.orden || 0));

        sorted.forEach(p => {
            features.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [p.longitud, p.latitud] },
                properties: {
                    id: p.id, nombre: p.nombre, linea: p.linea_nombre,
                    linea_color: p.linea_color, orden: p.orden || 0, tipo: "parada",
                    color: p.linea_color || "#00bcd4",
                },
            });
        });

        if (sorted.length > 1) {
            let coords;
            const ruta = line.ruta_geojson;
            if (ruta && typeof ruta === "string") {
                try {
                    const parsed = JSON.parse(ruta);
                    if (parsed?.type === "LineString" && Array.isArray(parsed.coordinates)) {
                        coords = parsed.coordinates;
                    }
                } catch (_) {}
            }
            if (!coords) {
                coords = sorted.map(p => [p.longitud, p.latitud]);
            }
            features.push({
                type: "Feature",
                geometry: { type: "LineString", coordinates: coords },
                properties: {
                    linea: line.nombre, color: line.color, tipo: line.tipo,
                },
                color: line.color,
            });
        }
    });

    return { type: "FeatureCollection", features };
}

export default function useParadas(active) {
    const { data, loading } = usePageData(() => api.get("/api/v1/paradas"), active, toGeoJSON);
    return { data, loading };
}
