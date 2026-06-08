import { useEffect, useRef } from 'react';
import useVoice from './useVoice';
import { playChime } from '../utils/alert-chime';

const ANUNCIO_RADIO = 80;
const ZONE_RADIUS = 300;
const ANGLE_THRESHOLD = 45;
const LOOKAHEAD_POINTS = 30;
const WINDOW = 3;
const PROGRESS_INTERVAL = 60000;
const ARRIVAL_RADIUS = 80;
const MIN_ANUNCIO = 40;

const PRIO = { ALTA: 3, NORMAL: 2, BAJA: 1 };

const PAUSA_MS = 180;

function toRad(x) {
    return (x * Math.PI) / 180;
}

function haversine(a, b) {
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371e3 * Math.asin(Math.sqrt(h));
}

function bearing(p1, p2) {
    const dLng = toRad(p2[1] - p1[1]);
    const rLat1 = toRad(p1[0]);
    const rLat2 = toRad(p2[0]);
    const y = Math.sin(dLng) * Math.cos(rLat2);
    const x = Math.cos(rLat1) * Math.sin(rLat2)
        - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angleDiff(a, b) {
    let d = Math.abs(a - b) % 360;
    if (d > 180) d = 360 - d;
    return d;
}

function diffSigned(b1, b2) {
    return ((b2 - b1 + 540) % 360) - 180;
}

function formatDistancia(m) {
    const c = Math.max(25, m);
    if (c < 1000) return `en ${Math.round(c / 50) * 50} metros`;
    return `en ${(c / 1000).toFixed(1).replace('.', ',')} kilómetros`;
}

function numeroOrdinal(n) {
    const ords = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];
    return n <= 10 ? ords[n] : `${n}ª`;
}

function encontrarPuntoPorDistanciaAcumulada(coords, distAcum, desdeIdx) {
    if (!coords || coords.length < 2) return null;
    let acc = 0;
    for (let i = Math.max(0, desdeIdx) + 1; i < coords.length; i++) {
        const seg = haversine(coords[i - 1], coords[i]);
        acc += seg;
        if (acc >= distAcum) {
            const t = (distAcum - (acc - seg)) / seg;
            return [
                coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]),
                coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]),
            ];
        }
    }
    return coords[coords.length - 1];
}

function dividirTexto(texto) {
    if (texto.length <= 80) return [texto];
    const partes = [];
    const porHacia = texto.split(/( hacia )/);
    for (let i = 0; i < porHacia.length; i++) {
        const p = porHacia[i];
        if (p === ' hacia ') {
            partes[partes.length - 1] += ' hacia';
        } else if (p) {
            partes.push(p.trim());
        }
    }
    if (partes.length >= 2 && texto.includes(',')) {
        const primera = partes[0];
        const resto = partes.slice(1).join(', ');
        return [primera, resto];
    }
    return partes;
}

export function generarInstruccion(step) {
    const { tipo, modificador, nombre } = step;
    let accion = '';

    switch (tipo) {
        case 'turn':
            if (modificador?.includes('left')) accion = 'Gire a la izquierda';
            else if (modificador?.includes('right')) accion = 'Gire a la derecha';
            else if (modificador === 'straight') accion = 'Siga recto';
            else if (modificador === 'uturn') accion = 'Gire en U';
            else accion = 'Gire';
            break;
        case 'merge':
            accion = 'Incorpórese';
            break;
        case 'roundabout':
        case 'roundabout turn':
        case 'rotary': {
            const salida = step.exit ? ` la ${numeroOrdinal(step.exit)} salida` : '';
            accion = `Tome${salida} en la rotonda`;
            break;
        }
        case 'fork':
            accion = modificador?.includes('left')
                ? 'Manténgase a la izquierda'
                : 'Manténgase a la derecha';
            break;
        case 'exit':
            accion = 'Tome la salida';
            break;
        case 'ramp':
            accion = 'Tome la rampa';
            break;
        case 'depart':
            accion = 'Inicie la ruta';
            break;
        case 'arrive':
            accion = 'Ha llegado a su destino';
            break;
        default:
            accion = modificador === 'straight' ? 'Siga recto' : 'Continúe';
    }

    const calle = nombre ? ` hacia ${nombre}` : '';
    return `${accion}${calle}`;
}

function generarTextoVoz(step, distM) {
    if (step.tipo === 'arrive') return 'Ha llegado a su destino';

    const { tipo, modificador, nombre, exit } = step;
    let verbo = '';

    switch (tipo) {
        case 'turn':
            if (modificador?.includes('left')) verbo = 'gire a la izquierda';
            else if (modificador?.includes('right')) verbo = 'gire a la derecha';
            else if (modificador === 'straight') verbo = 'siga recto';
            else if (modificador === 'uturn') verbo = 'gire en U';
            else verbo = 'gire';
            break;
        case 'merge':
            verbo = 'incorpórese';
            break;
        case 'roundabout':
        case 'roundabout turn':
        case 'rotary': {
            const salida = exit ? ` la ${numeroOrdinal(exit)} salida` : '';
            verbo = `tome${salida} en la rotonda`;
            break;
        }
        case 'fork':
            verbo = modificador?.includes('left')
                ? 'manténgase a la izquierda'
                : 'manténgase a la derecha';
            break;
        case 'exit':
            verbo = 'tome la salida';
            break;
        case 'ramp':
            verbo = 'tome la rampa';
            break;
        default:
            verbo = modificador === 'straight' ? 'siga recto' : 'continúe';
    }

    const calle = nombre ? ` hacia ${nombre}` : '';
    return `${formatDistancia(distM)}, ${verbo}${calle}`;
}

function generarTextoGeometrico(dSigned, distM) {
    const dir = dSigned >= 0 ? 'derecha' : 'izquierda';
    return `${formatDistancia(distM)}, gire a la ${dir}`;
}

function detectarGiroGeometrico(routeCoords, idxActual) {
    const fin = Math.min(idxActual + LOOKAHEAD_POINTS, routeCoords.length - 1 - WINDOW);
    const segmentos = [];
    let ultimoIdx = -100;
    for (let i = idxActual + WINDOW; i < fin; i++) {
        const bBefore = bearing(routeCoords[i - WINDOW], routeCoords[i]);
        const bAfter = bearing(routeCoords[i], routeCoords[i + WINDOW]);
        const diff = angleDiff(bBefore, bAfter);
        if (diff > ANGLE_THRESHOLD) {
            if (i - ultimoIdx < WINDOW * 2) continue;
            ultimoIdx = i;
            let distAcum = 0;
            for (let j = idxActual; j < i; j++) {
                distAcum += haversine(routeCoords[j], routeCoords[j + 1]);
            }
            const diffConSigno = diffSigned(bBefore, bAfter);
            segmentos.push({ idx: i, diff: diffConSigno, distancia: distAcum, punto: routeCoords[i] });
        }
    }
    return segmentos.slice(0, 3);
}

export default function useVoiceNavigation({ ubicacion, routeCoords, steps, zonasRiesgo, activo, routeInfo }) {
    const anunciadosRef = useRef(new Set());
    const zonasAnunciadasRef = useRef(new Set());
    const progresoRef = useRef(new Set());
    const llegadaRef = useRef(false);
    const prevRouteKeyRef = useRef('');
    const ultimoProgresoRef = useRef(0);
    const { speak, cancelAll } = useVoice();

    function anunciarTurno(key, texto) {
        if (anunciadosRef.current.has(key)) return;
        anunciadosRef.current.add(key);
        const partes = dividirTexto(texto);
        if (partes.length <= 1) {
            speak(texto, PRIO.ALTA);
        } else {
            speak(partes[0], PRIO.ALTA, () => {
                setTimeout(() => speak(partes[1], PRIO.ALTA), PAUSA_MS);
            });
        }
    }

    useEffect(() => {
        if (!activo) {
            anunciadosRef.current.clear();
            zonasAnunciadasRef.current.clear();
            progresoRef.current.clear();
            llegadaRef.current = false;
            prevRouteKeyRef.current = '';
            ultimoProgresoRef.current = 0;
            cancelAll();
            return;
        }

        if (!ubicacion || !routeCoords || routeCoords.length < 2) return;

        const routeKey = `${routeCoords.length}-${routeCoords[0][0].toFixed(4)}-${routeCoords[routeCoords.length - 1][0].toFixed(4)}`;
        if (prevRouteKeyRef.current !== '' && routeKey !== prevRouteKeyRef.current) {
            anunciadosRef.current.clear();
            speak('Recalculando ruta', PRIO.ALTA);
        }
        prevRouteKeyRef.current = routeKey;

        let minIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < routeCoords.length; i++) {
            const d = haversine(ubicacion, routeCoords[i]);
            if (d < minDist) { minDist = d; minIdx = i; }
        }

        // Check de llegada (siempre, antes del early return)
        if (!llegadaRef.current) {
            const distDestino = haversine(ubicacion, routeCoords[routeCoords.length - 1]);
            if (distDestino < ARRIVAL_RADIUS) {
                llegadaRef.current = true;
                speak('Ha llegado a su destino', PRIO.ALTA);
            }
        }

        if (minIdx >= routeCoords.length - 2) return;
        if (llegadaRef.current) return;

        const haySteps = steps && steps.length > 0;

        // Step-based turn announcements
        let cumDist = 0;
        if (haySteps) {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                cumDist += step.distancia || 0;
                let distStep = -1;
                if (step.punto) {
                    const [lng, lat] = step.punto;
                    distStep = haversine(ubicacion, [lat, lng]);
                } else if (step.distancia > 0) {
                    const est = encontrarPuntoPorDistanciaAcumulada(routeCoords, cumDist, 0);
                    if (est) {
                        distStep = haversine(ubicacion, est);
                    }
                }
                if (distStep >= MIN_ANUNCIO && distStep < ANUNCIO_RADIO) {
                    anunciarTurno(`step-${i}`, generarTextoVoz(step, distStep));
                }
            }
        }

        // Geometric fallback
        if (!haySteps) {
            const giros = detectarGiroGeometrico(routeCoords, minIdx);
            for (const giro of giros) {
                if (giro.distancia < MIN_ANUNCIO || giro.distancia >= ANUNCIO_RADIO) continue;
                if (typeof giro.diff !== 'number') continue;
                anunciarTurno(`geo-${giro.idx}`, generarTextoGeometrico(giro.diff, giro.distancia));
            }
        }

        // "Siga recto X metros" — next unannounced turn ahead
        if (haySteps) {
            for (let i = 0; i < steps.length; i++) {
                if (anunciadosRef.current.has(`step-${i}`)) continue;
                const step = steps[i];
                let dist = -1;
                if (step.punto) {
                    const [lng, lat] = step.punto;
                    dist = haversine(ubicacion, [lat, lng]);
                }
                const key = `straight-step-${i}`;
                if (dist > 50 && dist < 10000 && !anunciadosRef.current.has(key)) {
                    anunciadosRef.current.add(key);
                    speak(`Siga recto ${formatDistancia(dist)}`, PRIO.BAJA);
                }
                break;
            }
        } else {
            const sigGiros = detectarGiroGeometrico(routeCoords, minIdx);
            for (const giro of sigGiros) {
                if (anunciadosRef.current.has(`geo-${giro.idx}`)) continue;
                const key = `straight-geo-${giro.idx}`;
                if (giro.distancia > 50 && giro.distancia < 10000 && !anunciadosRef.current.has(key)) {
                    anunciadosRef.current.add(key);
                    speak(`Siga recto ${formatDistancia(giro.distancia)}`, PRIO.BAJA);
                }
                break;
            }
        }

        // Zone announcements
        if (zonasRiesgo?.features && Array.isArray(zonasRiesgo.features)) {
            zonasRiesgo.features.forEach((feature, idx) => {
                if (zonasAnunciadasRef.current.has(idx)) return;
                const props = feature.properties;
                if (!props || !feature.geometry?.coordinates) return;
                const ring = feature.geometry.coordinates[0];
                if (!ring || ring.length < 3) return;
                let latSum = 0, lngSum = 0;
                for (const c of ring) { lngSum += c[0]; latSum += c[1]; }
                const centro = [latSum / ring.length, lngSum / ring.length];
                const dist = haversine(ubicacion, centro);
                if (dist < ZONE_RADIUS) {
                    playChime();
                    const nivel = props.nivel || 'riesgo';
                    const nombre = props.nombre ? ` de ${props.nombre}` : '';
                    speak(
                        `Precaución, zona ${nivel}${nombre}`,
                        PRIO.NORMAL,
                        () => zonasAnunciadasRef.current.add(idx)
                    );
                }
            });
        }

        // Route progress announcements
        const progresoPct = (minIdx / routeCoords.length) * 100;
        const ahora = Date.now();
        if (ahora - ultimoProgresoRef.current > PROGRESS_INTERVAL) {
            const milestones = [25, 50, 75, 90];
            for (const m of milestones) {
                if (progresoPct >= m && !progresoRef.current.has(m)) {
                    progresoRef.current.add(m);
                    ultimoProgresoRef.current = ahora;
                    const duracionTotal = routeInfo?.duration || 0;
                    const restanteSeg = duracionTotal * (1 - minIdx / routeCoords.length);
                    const mins = Math.round(restanteSeg / 60);
                    if (mins > 0) {
                        speak(`Faltan aproximadamente ${mins} minutos para llegar`, PRIO.BAJA);
                    } else {
                        speak('Llegando al destino', PRIO.BAJA);
                    }
                    break;
                }
            }
        }
    }, [activo, ubicacion, routeCoords, steps, zonasRiesgo, routeInfo]);

    return null;
}
