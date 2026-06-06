import { useEffect, useRef, useState } from "react";
import getRoute from "../services/getRoute";

const RECALC_THRESHOLD = 0.001;

export default function useRouting(start, end, desviacion = false) {
    const [route, setRoute] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const prevStartRef = useRef(null);
    const prevEndRef = useRef(null);
    const fetchingRef = useRef(false);

    useEffect(() => {
        if (!start || !end) return;

        const startChanged =
            !prevStartRef.current ||
            Math.abs(prevStartRef.current[0] - start[0]) > RECALC_THRESHOLD ||
            Math.abs(prevStartRef.current[1] - start[1]) > RECALC_THRESHOLD;

        const endChanged =
            !prevEndRef.current ||
            prevEndRef.current[0] !== end[0] ||
            prevEndRef.current[1] !== end[1];

        if (!startChanged && !endChanged && !desviacion) return;
        if (fetchingRef.current) return;

        prevStartRef.current = start;
        prevEndRef.current = end;
        fetchingRef.current = true;

        const fetchRoute = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getRoute(start, end);
                setRoute(data.geometry);
                setRouteInfo({ distance: data.distance, duration: data.duration });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                fetchingRef.current = false;
            }
        };

        fetchRoute();
    }, [start, end, desviacion]);

    return { route, routeInfo, loading, error };
}
