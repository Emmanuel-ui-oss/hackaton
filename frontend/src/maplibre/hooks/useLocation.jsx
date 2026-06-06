import { useEffect, useState, useCallback } from "react";

const Geo_options = {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000,
}

function useLocation() {
    const [ubicacion, setUbicacion] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)

    const start = useCallback(() => {
        setCargando(true)
        setError(null)

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUbicacion([pos.coords.latitude, pos.coords.longitude])
                setCargando(false)
            },
            () => { },
            { ...Geo_options, timeout: 8000 }
        )

        const id = navigator.geolocation.watchPosition(
            (pos) => {
                setUbicacion([pos.coords.latitude, pos.coords.longitude])
                setCargando(false)
                setError(null)
            },
            (err) => {
                setUbicacion((prev) => {
                    if (!prev) setError(err.message)
                    return prev
                })
                setCargando(false)
            },
            Geo_options
        )

        return id
    }, [])

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Tu navegador no soporta geolocalización");
            setCargando(false);
            return;
        }

        const id = start();

        return () => navigator.geolocation.clearWatch(id);
    }, [start]);

    const reintentar = useCallback(() => {
        start();
    }, [start]);

    return { ubicacion, cargando, error, reintentar };
}

export default useLocation
