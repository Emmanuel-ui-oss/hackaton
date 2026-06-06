import { useState, useRef, useEffect } from 'react';

const R = 6371e3;

function haversine(a, b) {
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

const DEVIATION_THRESHOLD = 12;
const PERSISTENCE_COUNT = 3;

export default function useRouteProgress(ubicacion, route, accuracy = 0) {
    const [desviacion, setDesviacion] = useState(false);
    const [distancia, setDistancia] = useState(0);
    const [indiceCercano, setIndiceCercano] = useState(0);
    const contadorDesviacion = useRef(0);

    useEffect(() => {
        if (!ubicacion || !route || route.length < 2) return;

        let minDist = Infinity;
        let minIndex = 0;
        for (let i = 0; i < route.length; i++) {
            const d = haversine(ubicacion, route[i]);
            if (d < minDist) { minDist = d; minIndex = i; }
        }

        setIndiceCercano(minIndex);
        setDistancia(Math.round(minDist));

        const gpsAccuracy = accuracy > 0 ? accuracy : DEVIATION_THRESHOLD;
        const effectiveThreshold = Math.max(DEVIATION_THRESHOLD, gpsAccuracy);

        const estaFuera = minDist > effectiveThreshold;

        if (estaFuera && minIndex > 2) {
            contadorDesviacion.current += 1;
        } else if (!estaFuera) {
            contadorDesviacion.current = 0;
            setDesviacion(false);
        }

        if (contadorDesviacion.current >= PERSISTENCE_COUNT) {
            setDesviacion(true);
        }
    }, [ubicacion, route, accuracy]);

    return {
        desviacion,
        distanciaAlPuntoMasCercano: distancia,
        indiceCercano,
    };
}
