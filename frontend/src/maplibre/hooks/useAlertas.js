import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

export default function useAlertas(active) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (!active) { setData(null); fetched.current = false; return; }
        if (fetched.current) return;
        fetched.current = true;
        setLoading(true);
        api.get("/api/v1/alertas")
            .then(res => {
                const features = (res.data || []).map(a => ({
                    type: "Feature",
                    properties: { id: a.id, mensaje: a.mensaje, nivel: a.nivel, leida: a.leida },
                    geometry: {
                        type: "Point",
                        coordinates: [a.zona_riesgo?.longitud || -75.5636, a.zona_riesgo?.latitud || 6.2518],
                    },
                    nivel: a.nivel,
                }));
                setData({ type: "FeatureCollection", features });
            })
            .catch(() => { fetched.current = false; })
            .finally(() => setLoading(false));
    }, [active]);

    return { data, loading };
}
