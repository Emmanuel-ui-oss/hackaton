import { useEffect, useRef } from "react";

export default function useConfigGps({ ubicacion, setViewState, userMoved }) {
    const firstFix = useRef(false);

    useEffect(() => {
        if (!ubicacion) return;

        if (!firstFix.current) {
            firstFix.current = true;
            const [lat, lng] = ubicacion;
            setViewState(prev => ({ ...prev, longitude: lng, latitude: lat }));
        } else if (!userMoved) {
            const [lat, lng] = ubicacion;
            setViewState(prev => ({ ...prev, longitude: lng, latitude: lat }));
        }
    }, [ubicacion]);
}
