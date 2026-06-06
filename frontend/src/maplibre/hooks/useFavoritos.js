import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

export default function useFavoritos(active) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (!active) { setData(null); fetched.current = false; return; }
        if (fetched.current) return;
        fetched.current = true;
        setLoading(true);
        api.get("/api/v1/favoritos")
            .then(res => {
                const features = (res.data || []).map(f => ({
                    type: "Feature",
                    properties: { id: f.id, nombre: f.nombre, direccion: f.direccion },
                    geometry: { type: "Point", coordinates: [f.longitud, f.latitud] },
                }));
                setData({ type: "FeatureCollection", features });
            })
            .catch(() => { fetched.current = false; })
            .finally(() => setLoading(false));
    }, [active]);

    return { data, loading };
}
