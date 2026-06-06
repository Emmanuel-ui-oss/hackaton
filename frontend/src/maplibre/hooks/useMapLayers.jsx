import { useState } from "react";

export default function useMapLayers() {
    const [showRadar,   setShowRadar]   = useState(false);
    const [showTraffic, setShowTraffic] = useState(false);

    return { showRadar, setShowRadar, showTraffic, setShowTraffic };
}
