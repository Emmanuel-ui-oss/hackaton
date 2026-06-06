export function calculateRisk(route, riskZones) {
    let score = 0;
    for (const [lng, lat] of route.geometry?.coordinates || []) {
        for (const zone of riskZones) {
            const dx = zone.lng - lng;
            const dy = zone.lat - lat;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.01) score += zone.weight;
        }
    }
    return score;
}

export function applyTrafficPenalty(route, trafficData) {
    let penalty = 0;
    for (const point of route.geometry?.coordinates || []) {
        for (const t of trafficData) {
            const dx = t.lng - point[0];
            const dy = t.lat - point[1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.01) {
                if (t.congestion === "high") penalty += 3;
                if (t.congestion === "medium") penalty += 1;
            }
        }
    }
    return penalty;
}
