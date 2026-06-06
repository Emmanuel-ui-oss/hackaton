import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

export default function useParadas(active) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (!active) { setData(null); fetched.current = false; return; }
        if (fetched.current) return;
        fetched.current = true;
        setLoading(true);
        api.get("/api/v1/paradas")
            .then(res => {
                const features = (res.data || []).map(p => ({
                    type: "Feature",
                    properties: {
                        id: p.id, nombre: p.nombre,
                        linea: p.linea_nombre, linea_color: p.linea_color,
                    },
                    geometry: { type: "Point", coordinates: [p.longitud, p.latitud] },
                    color: p.linea_color || "#00bcd4",
                }));
                setData({ type: "FeatureCollection", features });
            })
            .catch(() => { fetched.current = false; })
            .finally(() => setLoading(false));
    }, [active]);

    return { data, loading };
}
