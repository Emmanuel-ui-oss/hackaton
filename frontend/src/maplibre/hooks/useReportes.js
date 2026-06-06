import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

const TIPO_COLORS = {
    accidente: "#ff1744",
    bloqueo: "#ffab00",
    zona_peligrosa: "#d500f9",
    robo: "#ff1744",
    clima: "#00bcd4",
    otro: "#9e9e9e",
};

export default function useReportes(active) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (!active) { setData(null); fetched.current = false; return; }
        if (fetched.current) return;
        fetched.current = true;
        setLoading(true);
        api.get("/api/v1/reportes")
            .then(res => {
                const features = (res.data || []).filter(r => r.activo !== false).map(r => ({
                    type: "Feature",
                    properties: { id: r.id, tipo: r.tipo, descripcion: r.descripcion, usuario: r.usuario_username },
                    geometry: { type: "Point", coordinates: [r.longitud, r.latitud] },
                    color: TIPO_COLORS[r.tipo] || "#9e9e9e",
                }));
                setData({ type: "FeatureCollection", features });
            })
            .catch(() => { fetched.current = false; })
            .finally(() => setLoading(false));
    }, [active]);

    return { data, loading };
}
