export default async function getSmartRoutes(start, end, key) {
    const baseUrl = `https://api.tomtom.com/routing/1/calculateRoute`;
    const common = `${start[0]},${start[1]}:${end[0]},${end[1]}`;
    const url = `${baseUrl}/${common}/json?key=${key}&traffic=true&computeBestOrder=false&maxAlternatives=2`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes) return null;
    return data.routes.map((r, index) => ({
        type: index === 0 ? "fast" : "eco",
        route: r,
        distance: r.summary.lengthInMeters,
        duration: r.summary.travelTimeInSeconds,
    }));
}
