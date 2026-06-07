import { useEffect, useRef, useCallback } from 'react'
import reverseGeocode from '../utils/reverseGeocode'

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
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const rLat1 = (lat1 * Math.PI) / 180
    const rLat2 = (lat2 * Math.PI) / 180
    const y = Math.sin(dLng) * Math.cos(rLat2)
    const x =
        Math.cos(rLat1) * Math.sin(rLat2) -
        Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng)
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function interpretarGiro(angleDiff) {
    const a = ((angleDiff + 180) % 360) - 180
    if (Math.abs(a) < 15) return 'continúe recto'
    if (a > 0 && a < 50) return 'gire suavemente a la derecha'
    if (a > 50 && a < 110) return 'gire a la derecha'
    if (a >= 110) return 'gire fuertemente a la derecha'
    if (a < 0 && a > -50) return 'gire suavemente a la izquierda'
    if (a < -50 && a > -110) return 'gire a la izquierda'
    return 'gire fuertemente a la izquierda'
}

function cardinal(bearing) {
    if (bearing >= 337.5 || bearing < 22.5) return 'norte'
    if (bearing >= 22.5 && bearing < 67.5) return 'nororiente'
    if (bearing >= 67.5 && bearing < 112.5) return 'oriente'
    if (bearing >= 112.5 && bearing < 157.5) return 'suroriente'
    if (bearing >= 157.5 && bearing < 202.5) return 'sur'
    if (bearing >= 202.5 && bearing < 247.5) return 'suroccidente'
    if (bearing >= 247.5 && bearing < 292.5) return 'occidente'
    return 'noroccidente'
}

let streetCache = {}

async function preloadStreetNames(routeCoords) {
    if (!routeCoords?.length) return
    const step = Math.max(1, Math.floor(routeCoords.length / 20))
    const points = []
    for (let i = 0; i < routeCoords.length; i += step) {
        const [lat, lng] = routeCoords[i]
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
        if (!streetCache[key]) points.push({ key, lat, lng })
    }
    await Promise.all(points.map(({ key, lat, lng }) =>
        reverseGeocode(lat, lng).then(name => { streetCache[key] = name })
    ))
}

async function getStreetName(lat, lng) {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
    if (streetCache[key]) return streetCache[key]
    const name = await reverseGeocode(lat, lng)
    streetCache[key] = name
    return name
}

export default function useVoiceNavigation({ ubicacion, routeCoords, zonasRiesgo, activo, heading }) {
    const pasoAnunciadoRef = useRef(-1)
    const zonaAnunciadaRef = useRef(new Set())
    const iniciadoRef = useRef(false)
    const activoAnteriorRef = useRef(false)
    const cacheLoadedRef = useRef(false)
    const colaRef = useRef([])
    const hablandoRef = useRef(false)
    const ultimoProgresoRef = useRef(0)
    const ultimoProgresoTsRef = useRef(0)

    const hablar = useCallback((texto, rate = 0.95) => {
        const synth = window.speechSynthesis
        if (!synth) return

        const emitir = (t, r) => {
            hablandoRef.current = true
            const utt = new SpeechSynthesisUtterance(t)
            utt.lang = 'es-CO'
            utt.rate = r
            utt.pitch = 1
            utt.volume = 1
            const voces = synth.getVoices()
            const voz =
                voces.find(v => v.lang === 'es-CO') ||
                voces.find(v => v.lang.startsWith('es-CO')) ||
                voces.find(v => v.lang === 'es-ES') ||
                voces.find(v => v.lang.startsWith('es'))
            if (voz) utt.voice = voz
            utt.onend = () => {
                hablandoRef.current = false
                if (colaRef.current.length > 0) {
                    const sig = colaRef.current.shift()
                    emitir(sig.texto, sig.rate)
                }
            }
            utt.onerror = () => { hablandoRef.current = false }
            synth.speak(utt)
        }

        if (hablandoRef.current) {
            colaRef.current.push({ texto, rate })
            return
        }
        emitir(texto, rate)
    }, [])

    const cancelar = useCallback(() => {
        window.speechSynthesis?.cancel()
        colaRef.current = []
        iniciadoRef.current = false
        hablandoRef.current = false
    }, [])

    // Pre-cargar nombres de calles de la ruta
    useEffect(() => {
        if (!routeCoords?.length || cacheLoadedRef.current) return
        cacheLoadedRef.current = true
        streetCache = {}
        preloadStreetNames(routeCoords)
    }, [routeCoords])

    // Anunciar inicio de ruta (solo cuando activo pasa de false → true)
    useEffect(() => {
        if (activo && !activoAnteriorRef.current && routeCoords?.length) {
            iniciadoRef.current = true
            let inicio = 'Ruta iniciada. Navegación por voz activada.'
            if (heading !== undefined && heading !== null) {
                inicio += ` Diríjase hacia el ${cardinal(heading)}.`
            }
            if (routeCoords.length > 1) {
                const [lat, lng] = routeCoords[0]
                getStreetName(lat, lng).then(nombre => {
                    if (nombre) hablar(`${inicio} Siga por ${nombre}.`)
                    else hablar(inicio)
                })
            } else {
                hablar(inicio)
            }
        }
        activoAnteriorRef.current = activo

        if (activo) return
        pasoAnunciadoRef.current = -1
        zonaAnunciadaRef.current.clear()
        iniciadoRef.current = false
        cacheLoadedRef.current = false
        colaRef.current = []
        hablandoRef.current = false
        ultimoProgresoRef.current = 0
        ultimoProgresoTsRef.current = 0
    }, [activo, routeCoords, hablar])

    // Instrucciones de giro + anuncios de progreso en recto
    useEffect(() => {
        if (!activo || !ubicacion || !routeCoords?.length) return

        let minDist = Infinity
        let indiceCercano = 0
        routeCoords.forEach(([lat, lng], i) => {
            const d = distanciaMetros(ubicacion, [lat, lng])
            if (d < minDist) { minDist = d; indiceCercano = i }
        })

        let turnoEncontrado = false
        for (let i = indiceCercano + 1; i < routeCoords.length - 1; i++) {
            const distAlPunto = distanciaMetros(ubicacion, routeCoords[i])
            if (distAlPunto > 400) break
            if (distAlPunto < 20) continue
            if (pasoAnunciadoRef.current === i) continue

            const iAntes = Math.max(0, i - 2)
            const iDespues = Math.min(routeCoords.length - 1, i + 2)
            const dirActual = calcularDireccion(routeCoords[iAntes], routeCoords[i])
            const dirSiguiente = calcularDireccion(routeCoords[i], routeCoords[iDespues])
            const absDiff = Math.abs(dirSiguiente - dirActual)
            const normDiff = Math.min(absDiff, 360 - absDiff)
            if (normDiff < 20) continue

            turnoEncontrado = true
            const instruccion = interpretarGiro(dirSiguiente - dirActual)
            const metros = Math.round(distAlPunto)

            const [lat, lng] = routeCoords[i + 1]
            getStreetName(lat, lng).then(nombre => {
                if (pasoAnunciadoRef.current >= i) return
                pasoAnunciadoRef.current = i
                ultimoProgresoRef.current = i
                ultimoProgresoTsRef.current = Date.now()
                const conDireccion = nombre
                    ? `${instruccion} en ${nombre}`
                    : instruccion
                if (metros > 80) {
                    hablar(`En ${metros} metros, ${conDireccion}.`)
                } else {
                    hablar(`Ahora, ${conDireccion}.`)
                }
            })
            break
        }

        if (!turnoEncontrado && minDist < 400 && minDist > 0) {
            const avance = indiceCercano - ultimoProgresoRef.current
            const ahora = Date.now()
            if (avance >= 5 || (ahora - ultimoProgresoTsRef.current > 20000 && avance >= 2)) {
                ultimoProgresoRef.current = indiceCercano
                ultimoProgresoTsRef.current = ahora
                const [lat, lng] = routeCoords[indiceCercano]
                getStreetName(lat, lng).then(nombre => {
                    if (nombre) hablar(`Continúe recto por ${nombre}.`)
                })
            }
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
