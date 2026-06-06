function formatDistance(meters) {
    if (meters == null) return "—";
    return meters >= 1000 ? (meters / 1000).toFixed(1) + " km" : Math.round(meters) + " m";
}

function formatDuration(seconds) {
    if (seconds == null) return "—";
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h ${min}min`;
}

export default function HUD({ desviacion, routeInfo }) {
    return (
        <div className="map-hud">
            <div className="map-hud__label">Estado</div>
            <div style={{ marginBottom: 10 }}>
                <span className={`map-hud__badge ${desviacion ? "map-hud__badge--warn" : "map-hud__badge--ok"}`}>
                    {desviacion ? "⚠ Fuera de ruta" : "✓ En ruta"}
                </span>
            </div>
            <hr className="map-hud__divider" />
            <div className="map-hud__label">Distancia</div>
            <div className="map-hud__value--sm">{formatDistance(routeInfo?.distance)}</div>
            <div className="map-hud__label">Tiempo estimado</div>
            <div className="map-hud__value--sm">{formatDuration(routeInfo?.duration)}</div>
        </div>
    );
}
