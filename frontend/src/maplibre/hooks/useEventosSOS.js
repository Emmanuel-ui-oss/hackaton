import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

export default function useEventosSOS(active) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (!active) { setData(null); fetched.current = false; return; }
        if (fetched.current) return;
        fetched.current = true;
        setLoading(true);
        api.get("/api/v1/sos")
            .then(res => {
                const features = (res.data || []).filter(s => s.activo !== false).map(s => ({
                    type: "Feature",
                    properties: { id: s.id, activo: s.activo, usuario: s.usuario, creado: s.creado },
                    geometry: { type: "Point", coordinates: [s.longitud || -75.5636, s.latitud || 6.2518] },
                }));
                setData({ type: "FeatureCollection", features });
            })
            .catch(() => { fetched.current = false; })
            .finally(() => setLoading(false));
    }, [active]);

    return { data, loading };
}
