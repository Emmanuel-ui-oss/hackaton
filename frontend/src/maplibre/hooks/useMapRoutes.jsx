import { useState, useRef } from "react";
import getRoute from "../services/getRoute";

export default function useMapRoutes(ubicacion) {
    const [routeFast,    setRouteFast]    = useState(null);
    const [routeSafe,    setRouteSafe]    = useState(null);
    const [routeInfo,    setRouteInfo]    = useState(null);
    const [routeType,    setRouteType]    = useState("fast");
    const [routeLoading, setRouteLoading] = useState(false);
    const [destination,  setDestination]  = useState(null);
    const [stepsFast,    setStepsFast]    = useState([]);  // <-- nuevo
    const [stepsSafe,    setStepsSafe]    = useState([]);  // <-- nuevo

    const fetchingRoute = useRef(false);

    const handleSelectDestino = (pos) => {
        setDestination(pos);
        if (!pos) {
            setRouteFast(null); setRouteSafe(null);
            setRouteInfo(null);
            setStepsFast([]); setStepsSafe([]);
        }
    };

    const fetchRoutes = async (dest) => {
        if (!ubicacion || !dest || fetchingRoute.current) return;
        fetchingRoute.current = true;
        setRouteLoading(true);
        try {
            const fast = await getRoute(ubicacion, dest);
            setRouteFast(fast.geometry);
            setStepsFast(fast.steps ?? []);
            setRouteInfo({ distance: fast.distance, duration: fast.duration });

            const midLat = (ubicacion[0] + dest[0]) / 2 + 0.005;
            const midLng = (ubicacion[1] + dest[1]) / 2 + 0.005;
            const [leg1, leg2] = await Promise.all([
                getRoute(ubicacion, [midLat, midLng]),
                getRoute([midLat, midLng], dest),
            ]);
            setRouteSafe({
                type: "LineString",
                coordinates: [
                    ...(leg1.geometry.coordinates ?? []),
                    ...(leg2.geometry.coordinates ?? []),
                ],
            });
            setStepsSafe([...(leg1.steps ?? []), ...(leg2.steps ?? [])]);
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
        stepsFast, stepsSafe,  // <-- nuevo
    };
}