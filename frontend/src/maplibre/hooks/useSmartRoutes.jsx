import { useEffect, useState } from "react";
import getSmartRoutes from "../services/getSmartRoutes";

export default function useSmartRoutes(start, end, key) {
    const [routes, setRoutes] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!start || !end) return;

        const run = async () => {
            setLoading(true);
            const result = await getSmartRoutes(start, end, key);
            if (result) {
                const fast = result[0];
                const eco = result[1] || result[0];
                setRoutes({ fast, eco });
            }
            setLoading(false);
        };

        run();
    }, [start, end]);

    return { routes, loading };
}
