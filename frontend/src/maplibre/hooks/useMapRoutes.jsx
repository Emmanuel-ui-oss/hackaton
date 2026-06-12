import { useState, useRef, useCallback, useEffect } from "react";
import getRoute from "../services/getRoute";

export default function useMapRoutes(ubicacion) {
    const [routeFast,    setRouteFast]    = useState(null);
    const [routeSafe,    setRouteSafe]    = useState(null);
    const [routeInfo,    setRouteInfo]    = useState(null);
    const [routeType,    setRouteType]    = useState("fast");
    const [transportMode, setTransportMode] = useState("car");
    const [routeLoading, setRouteLoading] = useState(false);
    const [destination,  setDestination]  = useState(null);
    const [stepsFast,    setStepsFast]    = useState([]);
    const [stepsSafe,    setStepsSafe]    = useState([]);
    const [routeSegments, setRouteSegments] = useState(null);

    const fetchingRoute = useRef(false);
    const prevModeRef = useRef(transportMode);

    useEffect(() => {
        if (prevModeRef.current !== transportMode) {
            fetchingRoute.current = false;
            prevModeRef.current = transportMode;
        }
    }, [transportMode]);

    const handleSelectDestino = (pos) => {
        setDestination(pos);
        if (!pos) {
            setRouteFast(null); setRouteSafe(null);
            setRouteInfo(null);
            setStepsFast([]); setStepsSafe([]);
            setRouteSegments(null);
        }
    };

    const fetchRoutes = useCallback(async (dest) => {
        if (!ubicacion || !dest || fetchingRoute.current) return;
        fetchingRoute.current = true;
        setRouteLoading(true);
        try {
            const routeData = await getRoute(ubicacion, dest, transportMode);
            if (!routeData) return;

            if (transportMode === "transit") {
                setRouteFast(routeData.geometry);
                setRouteSafe(null);
                setStepsFast(routeData.steps ?? []);
                setStepsSafe([]);
                setRouteSegments(routeData.segments ?? null);
                setRouteInfo({ distance: routeData.distance, duration: routeData.duration });
            } else {
                setRouteFast(routeData.geometry);
                setStepsFast(routeData.steps ?? []);
                setRouteInfo({ distance: routeData.distance, duration: routeData.duration });

                if (transportMode === "car" || transportMode === "moto") {
                    const midLat = (ubicacion[0] + dest[0]) / 2 + 0.005;
                    const midLng = (ubicacion[1] + dest[1]) / 2 + 0.005;
                    const [leg1, leg2] = await Promise.all([
                        getRoute(ubicacion, [midLat, midLng], transportMode),
                        getRoute([midLat, midLng], dest, transportMode),
                    ]);
                    if (leg1 && leg2) {
                        setRouteSafe({
                            type: "LineString",
                            coordinates: [
                                ...(leg1.geometry.coordinates ?? []),
                                ...(leg2.geometry.coordinates ?? []),
                            ],
                        });
                        setStepsSafe([...(leg1.steps ?? []), ...(leg2.steps ?? [])]);
                    }
                }
            }
        } catch (err) {
            console.error("Error calculando rutas:", err);
        } finally {
            setRouteLoading(false);
            fetchingRoute.current = false;
        }
    }, [ubicacion, transportMode]);

    return {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        transportMode, setTransportMode,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
        stepsFast, stepsSafe,
        routeSegments,
    };
}