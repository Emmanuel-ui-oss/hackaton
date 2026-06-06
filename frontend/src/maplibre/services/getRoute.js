export default async function getRoute(start, end) {
    if (!start || !end) return null;
    const params = new URLSearchParams({ olat: start[0], olng: start[1], dlat: end[0], dlng: end[1] });
    const res = await fetch(`/api/v1/routes?${params}`);
    if (!res.ok) throw new Error("Route request failed");
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("No route found");
    return {
        geometry: { type: "LineString", coordinates: route.coords.map(c => [c[1], c[0]]) },
        distance: route.distance_m,
        duration: route.duration_s,
    };
}

export async function getBaseRoute(start, end) {
    const route = await getRoute(start, end);
    if (!route) throw new Error("No route");
    return {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        legs: [],
    };
}

export function buildSmartRoutes(baseRoute, riskZones) {
    const riskScore = baseRoute.distance || 0;
    return {
        fast: { ...baseRoute, score: riskScore * 0.5 },
        safe: { ...baseRoute, score: riskScore * 2 },
        balanced: { ...baseRoute, score: riskScore },
    };
}

export function scoreRoute(route, riskZones, trafficData) {
    const risk = route.distance || 0;
    const traffic = trafficData?.length ? risk * 0.2 : 0;
    return risk + traffic;
}
