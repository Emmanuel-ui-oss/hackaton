import { useState, useRef } from "react";
import getRoute from "../services/getRoute";

export default function useMapRoutes(ubicacion) {
    const [routeFast,    setRouteFast]    = useState(null);
    const [routeSafe,    setRouteSafe]    = useState(null);
    const [routeInfo,    setRouteInfo]    = useState(null);
    const [routeType,    setRouteType]    = useState("fast");
    const [routeLoading, setRouteLoading] = useState(false);
    const [destination,  setDestination]  = useState(null);

    const fetchingRoute = useRef(false);

    const handleSelectDestino = (pos) => {
        setDestination(pos);
        if (!pos) { setRouteFast(null); setRouteSafe(null); setRouteInfo(null); }
    };

    const fetchRoutes = async (dest) => {
        if (!ubicacion || !dest || fetchingRoute.current) return;
        fetchingRoute.current = true;
        setRouteLoading(true);
        try {
            const fast = await getRoute(ubicacion, dest);
            setRouteFast(fast.geometry);
            setRouteInfo({ distance: fast.distance, duration: fast.duration });

            const midLat = (ubicacion[0] + dest[0]) / 2 + 0.005;
            const midLng = (ubicacion[1] + dest[1]) / 2 + 0.005;
            const leg1 = await getRoute(ubicacion, [midLat, midLng]);
            const leg2 = await getRoute([midLat, midLng], dest);
            setRouteSafe({ type: "LineString", coordinates: [...(leg1.geometry.coordinates || []), ...(leg2.geometry.coordinates || [])] });
        } catch (err) {
            console.error("Error calculando rutas:", err);
        } finally {
            setRouteLoading(false);
            fetchingRoute.current = false;
        }
    };

    return {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
    };
}
