import { useState, useEffect } from "react";
import getWeather from "../services/getWeather";

export default function useWeather(ubicacion) {
    const [weather, setWeather] = useState(null);

    useEffect(() => {
        if (!ubicacion) return;
        getWeather(ubicacion[0], ubicacion[1], setWeather);
    }, [ubicacion]);

    return { weather };
}
