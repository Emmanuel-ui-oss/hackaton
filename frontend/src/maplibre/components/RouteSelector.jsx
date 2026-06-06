export default function RouteSelector({ routeType, setRouteType, routeFast, routeSafe, destination }) {
    if (!destination || (!routeFast && !routeSafe)) return null;

    return (
        <div className="route-selector">
            <button className={`route-selector__btn ${routeType === "fast" ? "route-selector__btn--active-fast" : ""}`} onClick={() => setRouteType("fast")}>
                🟦 Rápida
            </button>
            <button className={`route-selector__btn ${routeType === "safe" ? "route-selector__btn--active-safe" : ""}`} onClick={() => setRouteType("safe")}>
                🟩 Segura
            </button>
        </div>
    );
}
