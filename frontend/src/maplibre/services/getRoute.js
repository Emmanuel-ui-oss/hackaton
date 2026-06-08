export default async function getRoute(start, end) {
    if (!start || !end) return null;
    const params = new URLSearchParams({
        olat: start[0], olng: start[1],
        dlat: end[0],   dlng: end[1],
        // Pedir steps=true por si el backend lo soporta (OSRM lo hace)
        steps: true,
    });
    const res = await fetch(`/api/v1/routes?${params}`);
    if (!res.ok) throw new Error("Route request failed");
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("No route found");

    // Intentar leer steps del backend (OSRM los devuelve en route.legs[].steps[])
    const steps = extraerSteps(route);

    return {
        geometry: { type: "LineString", coordinates: route.coords.map(c => [c[1], c[0]]) },
        distance: route.distance_m,
        duration: route.duration_s,
        steps,  // <-- nuevo
    };
}

// Extrae steps normalizados sin importar el formato exacto del backend.
// Soporta OSRM nativo (legs[].steps[]) y formato simplificado propio.
function extraerSteps(route) {
    // Formato OSRM nativo: route.legs[0].steps[]
    const legs = route.legs ?? route.route_legs ?? []
    for (const leg of legs) {
        const rawSteps = leg.steps ?? []
        if (rawSteps.length > 0) {
            return rawSteps
                .filter(s => s.maneuver?.type !== 'depart' && s.maneuver?.type !== 'arrive' || rawSteps.length <= 2)
                .map(s => ({
                    distancia: s.distance ?? 0,         // metros hasta este giro
                    nombre: s.name ?? '',               // nombre de la calle a tomar
                    tipo: s.maneuver?.type ?? 'turn',   // 'turn', 'merge', 'roundabout'…
                    modificador: s.maneuver?.modifier ?? '',  // 'left','right','slight left'…
                    bearing: s.maneuver?.bearing_after ?? null,
                    punto: s.maneuver?.location ?? null,
                    exit: s.maneuver?.exit ?? null,
                }))
                .filter(s => s.distancia > 0 || s.nombre)
        }
    }

    // Formato propio/desconocido: intentar leer route.steps[] directamente
    const propios = route.steps ?? route.instrucciones ?? []
    if (propios.length > 0) {
        return propios.map(s => ({
            distancia: s.distance_m ?? s.distancia ?? s.distance ?? 0,
            nombre: s.street ?? s.nombre ?? s.name ?? '',
            tipo: s.type ?? s.tipo ?? 'turn',
            modificador: s.modifier ?? s.modificador ?? s.direction ?? '',
            bearing: s.bearing ?? null,
            punto: s.location ?? s.punto ?? null,
        }))
    }

    // El backend no devuelve steps: retornar vacío.
    // useVoiceNavigation caerá en modo geométrico de respaldo.
    return []
}