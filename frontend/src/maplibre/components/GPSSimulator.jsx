import { useState, useRef, useEffect } from 'react'

function calcularBearing([lat1, lng1], [lat2, lng2]) {
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const rLat1 = (lat1 * Math.PI) / 180
    const rLat2 = (lat2 * Math.PI) / 180
    const y = Math.sin(dLng) * Math.cos(rLat2)
    const x =
        Math.cos(rLat1) * Math.sin(rLat2) -
        Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng)
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function useGPSSimulator(routeCoords, setViewState) {
    const [activo, setActivo] = useState(false)
    const [pos, setPos] = useState(null)
    const [bearing, setBearing] = useState(0)
    const idxRef = useRef(0)
    const timerRef = useRef(null)
    const puedeSimular = routeCoords?.length >= 2

    useEffect(() => {
        if (!activo) {
            clearInterval(timerRef.current)
            setPos(null)
            setBearing(0)
            return
        }
        idxRef.current = 0
        timerRef.current = setInterval(() => {
            const ruta = routeCoords
            if (!ruta || idxRef.current >= ruta.length) {
                clearInterval(timerRef.current)
                setActivo(false)
                setPos(null)
                setBearing(0)
                return
            }
            const punto = ruta[idxRef.current]
            setPos(punto)

            if (idxRef.current < ruta.length - 1) {
                const sig = ruta[idxRef.current + 1]
                setBearing(calcularBearing(punto, sig))
            }

            if (setViewState) {
                setViewState(prev => ({
                    ...prev,
                    longitude: punto[1],
                    latitude: punto[0],
                    zoom: 16.5,
                }))
            }
            idxRef.current++
        }, 1500)
        return () => clearInterval(timerRef.current)
    }, [activo, routeCoords])

    return { pos, bearing, activo, puedeSimular, toggle: () => setActivo(v => !v) }
}
