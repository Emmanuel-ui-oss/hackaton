import { useEffect, useRef, useCallback } from 'react'

function distanciaMetros([lat1, lng1], [lat2, lng2]) {
    const R = 6371000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcularDireccion([lat1, lng1], [lat2, lng2]) {
    const dLng = lng2 - lng1
    const y = Math.sin((dLng * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
    const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos((dLng * Math.PI) / 180)
    const bearing = (Math.atan2(y, x) * 180) / Math.PI
    return (bearing + 360) % 360
}

function interpretarGiro(angleDiff) {
    const a = ((angleDiff + 180) % 360) - 180
    if (Math.abs(a) < 20) return 'continúe recto'
    if (a > 0 && a < 60) return 'gire suavemente a la derecha'
    if (a > 60 && a < 120) return 'gire a la derecha'
    if (a >= 120) return 'gire fuertemente a la derecha'
    if (a < 0 && a > -60) return 'gire suavemente a la izquierda'
    if (a < -60 && a > -120) return 'gire a la izquierda'
    return 'gire fuertemente a la izquierda'
}

export default function useVoiceNavigation({ ubicacion, routeCoords, zonasRiesgo, activo }) {
    const pasoAnunciadoRef = useRef(-1)
    const zonaAnunciadaRef = useRef(new Set())
    const iniciadoRef = useRef(false)

    const hablar = useCallback((texto, rate = 0.95) => {
        const synth = window.speechSynthesis
        if (!synth) return
        synth.cancel()
        const utt = new SpeechSynthesisUtterance(texto)
        utt.lang = 'es-CO'
        utt.rate = rate
        utt.pitch = 1
        utt.volume = 1
        const voces = synth.getVoices()
        const voz =
            voces.find(v => v.lang === 'es-CO') ||
            voces.find(v => v.lang.startsWith('es-CO')) ||
            voces.find(v => v.lang === 'es-ES') ||
            voces.find(v => v.lang.startsWith('es'))
        if (voz) utt.voice = voz
        synth.speak(utt)
    }, [])

    const cancelar = useCallback(() => {
        window.speechSynthesis?.cancel()
    }, [])

    // Anunciar inicio de ruta
    useEffect(() => {
        if (!activo || !routeCoords?.length) return
        if (!iniciadoRef.current) {
            iniciadoRef.current = true
            hablar('Ruta iniciada. Navegación por voz activada.')
        }
        return () => {
            iniciadoRef.current = false
            pasoAnunciadoRef.current = -1
            zonaAnunciadaRef.current.clear()
            window.speechSynthesis?.cancel()
        }
    }, [activo, routeCoords, hablar])

    // Instrucciones de giro
    useEffect(() => {
        if (!activo || !ubicacion || !routeCoords?.length) return

        let minDist = Infinity
        let indiceCercano = 0
        routeCoords.forEach(([lat, lng], i) => {
            const d = distanciaMetros(ubicacion, [lat, lng])
            if (d < minDist) { minDist = d; indiceCercano = i }
        })

        for (let i = indiceCercano + 1; i < routeCoords.length - 1; i++) {
            const distAlPunto = distanciaMetros(ubicacion, routeCoords[i])
            if (distAlPunto > 250) break
            if (distAlPunto < 15) continue
            if (pasoAnunciadoRef.current === i) break

            const dirActual = calcularDireccion(routeCoords[i - 1], routeCoords[i])
            const dirSiguiente = calcularDireccion(routeCoords[i], routeCoords[i + 1])
            const diff = Math.abs(dirSiguiente - dirActual)
            if (diff < 25) continue

            const instruccion = interpretarGiro(dirSiguiente - dirActual)
            const metros = Math.round(distAlPunto)
            pasoAnunciadoRef.current = i

            if (metros > 80) {
                hablar(`En ${metros} metros, ${instruccion}`)
            } else {
                hablar(`Ahora, ${instruccion}`)
            }
            break
        }
    }, [ubicacion, routeCoords, activo, hablar])

    // Alertas de zonas de riesgo
    useEffect(() => {
        if (!activo || !ubicacion || !zonasRiesgo?.features) return

        zonasRiesgo.features.forEach(f => {
            const id = f.properties?.id
            if (!id || zonaAnunciadaRef.current.has(id)) return

            const coords = f.geometry?.coordinates?.[0]
            if (!coords?.length) return

            const centroide = coords.reduce(
                (acc, [lng, lat]) => [acc[0] + lat, acc[1] + lng],
                [0, 0]
            ).map(v => v / coords.length)

            const dist = distanciaMetros(ubicacion, centroide)
            if (dist < 300) {
                zonaAnunciadaRef.current.add(id)
                const nivel = f.properties.nivel || ''
                const nombre = f.properties.nombre || 'zona de riesgo'
                hablar(`Atención. Se acerca a una zona de riesgo ${nivel.toLowerCase()}: ${nombre}`)
            }
        })
    }, [ubicacion, zonasRiesgo, activo, hablar])

    return { hablar, cancelar }
}