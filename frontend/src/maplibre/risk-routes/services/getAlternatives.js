export default async function getAlternatives(start, end) {
    if (!start || !end) return []
    const params = new URLSearchParams({
        olat: start[0], olng: start[1],
        dlat: end[0],   dlng: end[1],
        alternatives: true,
        steps: true,
    })
    const res = await fetch(`/api/v1/routes?${params}`)
    if (!res.ok) throw new Error("Route alternatives request failed")
    const data = await res.json()
    const routes = data.routes ?? []

    return routes.map(route => ({
        coords: route.coords.map(c => [c[0], c[1]]),
        geometry: { type: "LineString", coordinates: route.coords.map(c => [c[1], c[0]]) },
        distance: route.distance_m,
        duration: route.duration_s,
        steps: extraerSteps(route),
    }))
}

function extraerSteps(route) {
    const legs = route.legs ?? route.route_legs ?? []
    for (const leg of legs) {
        const rawSteps = leg.steps ?? []
        if (rawSteps.length > 0) {
            return rawSteps
                .filter(s => s.maneuver?.type !== 'depart' && s.maneuver?.type !== 'arrive' || rawSteps.length <= 2)
                .map(s => ({
                    distancia: s.distance ?? 0,
                    nombre: s.name ?? '',
                    tipo: s.maneuver?.type ?? 'turn',
                    modificador: s.maneuver?.modifier ?? '',
                    bearing: s.maneuver?.bearing_after ?? null,
                    punto: s.maneuver?.location ?? null,
                    exit: s.maneuver?.exit ?? null,
                }))
                .filter(s => s.distancia > 0 || s.nombre)
        }
    }
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
    return []
}
