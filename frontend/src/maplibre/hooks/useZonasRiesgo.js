import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

const NIVEL_COLORS = {
    CRITICO: "#ff1744",
    ALTO: "#ffab00",
    MEDIO: "#2979ff",
    BAJO: "#00c853",
};

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

export default function useZonasRiesgo(active) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (!active) { setData(null); fetched.current = false; return; }
        if (fetched.current) return;
        fetched.current = true;
        setLoading(true);
        api.get("/api/v1/zonas-riesgo")
            .then(res => {
                const features = (res.data || []).map(z => {
                    const nivel = z.nivel || "BAJO";
                    const r = z.radio_metros || 200;
                    const color = NIVEL_COLORS[nivel] || "#888";
                    const polygon = circlePolygon(z.latitud, z.longitud, r);
                    return {
                        type: "Feature",
                        properties: { id: z.id, nombre: z.nombre, nivel, color, opacidad: nivel === "CRITICO" ? 0.18 : 0.12 },
                        geometry: {
                            type: "Polygon",
                            coordinates: [polygon],
                        },
                    };
                });
                setData({ type: "FeatureCollection", features });
            })
            .catch(() => { fetched.current = false; })
            .finally(() => setLoading(false));
    }, [active]);

    return { data, loading };
}
