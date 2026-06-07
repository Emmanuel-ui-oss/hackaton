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
