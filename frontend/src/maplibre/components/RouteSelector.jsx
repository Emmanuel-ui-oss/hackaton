import { Car, Moto, Train, Walking, CableCar_svg, Tranvia_svg, Shield, Zap } from "../../icons";

export default function RouteSelector({
    routeType, setRouteType,
    routeFast, routeSafe,
    destination,
    transportMode, setTransportMode,
    routeInfo, routeLoading,
    fetchRoutes,
    routeSegments,
}) {
    if (!destination) return null;

    const MODES = [
        { key: "car", label: "Carro", icon: Car },
        { key: "moto", label: "Moto", icon: Moto },
        { key: "transit", label: "Metro", icon: Train },
        { key: "walking", label: "A pie", icon: Walking },
    ];

    const formatTime = (s) => {
        if (s == null) return "";
        const m = Math.round(s / 60);
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        const r = m % 60;
        return r ? `${h}h ${r}min` : `${h}h`;
    };

    const handleModeChange = (mode) => {
        if (mode === transportMode) return;
        setTransportMode(mode);
        setRouteType("fast");
    };

    const showSub = transportMode === "car" || transportMode === "moto";
    const rideSegments = routeSegments?.filter((s) => s.type !== "transfer" && (s.type === "metro" || s.type === "metro_cable" || s.type === "tranvia")) ?? [];
    const numTransfers = rideSegments.length > 1 ? rideSegments.length - 1 : 0;

    const TYPE_ICONS = { metro: Train, metro_cable: CableCar_svg, tranvia: Tranvia_svg };

    return (
        <div className="route-selector">
            <div className="route-selector__modes">
                {MODES.map((m) => (
                    <button
                        key={m.key}
                        className={`route-selector__mode ${transportMode === m.key ? "route-selector__mode--active" : ""}`}
                        onClick={() => handleModeChange(m.key)}
                    >
                        <span className="route-selector__mode-icon">{m.icon}</span>
                        <span className="route-selector__mode-label">{m.label}</span>
                        {transportMode === m.key && routeInfo && !routeLoading && (
                            <span className="route-selector__mode-time">{formatTime(routeInfo.duration)}</span>
                        )}
                    </button>
                ))}
            </div>
            {showSub && routeFast && routeSafe && (
                <div className="route-selector__sub">
                    <button
                        className={`route-selector__btn ${routeType === "fast" ? "route-selector__btn--active-fast" : ""}`}
                        onClick={() => setRouteType("fast")}
                    >{Zap} Rápida</button>
                    <button
                        className={`route-selector__btn ${routeType === "safe" ? "route-selector__btn--active-safe" : ""}`}
                        onClick={() => setRouteType("safe")}
                    >{Shield} Segura</button>
                </div>
            )}
            {rideSegments.length > 0 && (
                <div className="route-selector__metro-info">
                    <div className="route-selector__metro-summary">
                        {numTransfers > 0 && <span className="route-selector__transfers">{numTransfers} transbordo{numTransfers > 1 ? "s" : ""} · </span>}
                        <span>{rideSegments.reduce((s, seg) => s + seg.stops, 0)} paradas</span>
                    </div>
                    {rideSegments.map((seg, i) => (
                        <div key={i} className="route-selector__metro-line">
                            {TYPE_ICONS[seg.type] || Train} <strong>{seg.line}</strong>: {seg.from} → {seg.to}
                            <span className="route-selector__metro-stops">{seg.stops} paradas · {formatTime(seg.duration_s)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
