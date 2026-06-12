import usePageData from "../../hooks/usePageData";

function toGeoJSON(data) {
    const features = (data || []).map(f => ({
        type: "Feature",
        properties: { id: f.id, nombre: f.nombre, direccion: f.direccion },
        geometry: { type: "Point", coordinates: [f.longitud, f.latitud] },
    }));
    return { type: "FeatureCollection", features };
}

export default function useFavoritos(active) {
    const { data: raw, loading, invalidate } = usePageData("/api/v1/favoritos", active);
    const geoJSON = raw ? toGeoJSON(raw) : null;
    return { data: geoJSON, raw, loading, invalidate };
}
