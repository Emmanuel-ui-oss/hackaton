function destinationPoint(lat, lng, bearing, distance) {
    const R = 6371e3;
    const δ = distance / R;
    const θ = (bearing * Math.PI) / 180;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lng * Math.PI) / 180;
    const φ2 = Math.asin(
        Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    const λ2 = λ1 + Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
    return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}

export default function getVisionCone(center, heading, currentZoom = 15, spread = 90) {
    const [lat, lng] = center;
    const points = [];
    const step = 5;
    const SCALE_CONSTANT = 20000;
    const OFFSET_CONSTANT = 10;
    const dynamicDistance = SCALE_CONSTANT / Math.pow(2, currentZoom - OFFSET_CONSTANT);

    points.push([lng, lat]);

    for (let angle = -spread; angle <= spread; angle += step) {
        const point = destinationPoint(lat, lng, heading + angle, dynamicDistance);
        points.push(point);
    }

    points.push(points[0]);
    return points;
}
