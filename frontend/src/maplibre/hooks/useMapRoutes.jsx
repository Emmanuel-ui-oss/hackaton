import { useState, useRef, useCallback, useEffect } from "react";
import getRoute from "../services/getRoute";
import planMetroRoute from "../services/planMetroRoute";

export default function useMapRoutes(ubicacion, transportData = null) {
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
    const [walkingLegs, setWalkingLegs] = useState(null);

    const fetchingRoute = useRef(false);
    const ubicacionRef = useRef(ubicacion);
    const transportRef = useRef(transportData);
    const lastCalcKey = useRef("");

    ubicacionRef.current = ubicacion;
    if (transportData) transportRef.current = transportData;

    const handleSelectDestino = (pos) => {
        setDestination(pos);
        if (!pos) {
            setRouteFast(null); setRouteSafe(null);
            setRouteInfo(null);
            setStepsFast([]); setStepsSafe([]);
            setRouteSegments(null);
            setWalkingLegs(null);
            lastCalcKey.current = "";
        }
    };

    const fetchRoutes = useCallback(async (dest) => {
        const loc = ubicacionRef.current;
        const td = transportRef.current;
        if (!loc || !dest || fetchingRoute.current) return;

        const key = `${dest[0]},${dest[1]},${transportMode},${td?.features?.length ?? 0}`;
        if (lastCalcKey.current === key) return;
        lastCalcKey.current = key;

        fetchingRoute.current = true;
        setRouteLoading(true);
        try {
            if (transportMode === "transit" && td?.features?.length) {
                const plan = planMetroRoute(loc[0], loc[1], dest[0], dest[1], td);
                if (plan.paradaStart && plan.paradaEnd && plan.transportSegments.length > 0) {
                    const walkOrigin = plan.paradaStart.lat !== loc[0] || plan.paradaStart.lng !== loc[1]
                        ? await getRoute(loc, [plan.paradaStart.lat, plan.paradaStart.lng], "walking")
                        : null;
                    const walkDest = plan.paradaEnd.lat !== dest[0] || plan.paradaEnd.lng !== dest[1]
                        ? await getRoute([plan.paradaEnd.lat, plan.paradaEnd.lng], dest, "walking")
                        : null;

                    const allCoords = [
                        ...(walkOrigin?.geometry?.coordinates ?? []),
                        ...plan.transportSegments.flatMap(s => s.coords),
                        ...(walkDest?.geometry?.coordinates ?? []),
                    ];

                    const totalDist = (walkOrigin?.distance ?? 0) + plan.transportSegments.reduce((s, seg) => s + seg.stops * 1.2, 0) + (walkDest?.distance ?? 0);
                    const totalDur = (walkOrigin?.duration ?? 0) + plan.transportSegments.reduce((s, seg) => s + seg.duration_s, 0) + (walkDest?.duration ?? 0);

                    const walkLegs = [];
                    if (walkOrigin) walkLegs.push({ coords: walkOrigin.geometry.coordinates, from: "Origen", to: plan.paradaStart.nombre, type: "walk", distance: walkOrigin.distance, duration: walkOrigin.duration });
                    if (walkDest) walkLegs.push({ coords: walkDest.geometry.coordinates, from: plan.paradaEnd.nombre, to: "Destino", type: "walk", distance: walkDest.distance, duration: walkDest.duration });

                    setRouteFast({ type: "LineString", coordinates: allCoords });
                    setRouteSafe(null);
                    setStepsFast([]);
                    setStepsSafe([]);
                    setRouteSegments(plan.transportSegments);
                    setWalkingLegs(walkLegs);
                    setRouteInfo({ distance: totalDist, duration: totalDur });
                } else {
                    const routeData = await getRoute(loc, dest, "walking");
                    if (routeData) {
                        setRouteFast(routeData.geometry);
                        setRouteSafe(null);
                        setStepsFast(routeData.steps ?? []);
                        setStepsSafe([]);
                        setRouteSegments([]);
                        setWalkingLegs(null);
                        setRouteInfo({ distance: routeData.distance, duration: routeData.duration });
                    }
                }
            } else {
                const routeData = await getRoute(loc, dest, transportMode);
                if (!routeData) return;
                setRouteFast(routeData.geometry);
                setStepsFast(routeData.steps ?? []);
                setRouteInfo({ distance: routeData.distance, duration: routeData.duration });

                if (transportMode === "car" || transportMode === "moto") {
                    const midLat = (loc[0] + dest[0]) / 2 + 0.005;
                    const midLng = (loc[1] + dest[1]) / 2 + 0.005;
                    const [leg1, leg2] = await Promise.all([
                        getRoute(loc, [midLat, midLng], transportMode),
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
    }, [transportMode]);

    return {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        transportMode, setTransportMode,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
        stepsFast, stepsSafe,
        routeSegments,
        walkingLegs,
    };
}