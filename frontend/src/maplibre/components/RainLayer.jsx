import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";

export default function RainLayer({ visible }) {
    const mapRef = useMap();

    function getMapInstance() {
        return (mapRef?.current?.getMap?.() || mapRef?.getMap?.() || null);
    }

    useEffect(() => {
        async function loadRain() {
            const map = getMapInstance();
            if (!map || !visible) return;

            try {
                const response = await fetch("/api/v1/proxy/rainviewer/manifest");
                const data = await response.json();
                const frame = data.radar.past.at(-1);
                const tileUrl = `https://tilecache.rainviewer.com${frame.path}/512/{z}/{x}/{y}/2/1_1.png`;

                if (!map.getSource("rain")) {
                    map.addSource("rain", {
                        type: "raster",
                        tiles: [tileUrl],
                        tileSize: 512,
                    });
                    map.addLayer({
                        id: "rain-layer",
                        type: "raster",
                        source: "rain",
                        paint: { "raster-opacity": 0.7 },
                    });
                }
            } catch (error) {
                console.error("Error cargando radar:", error);
            }
        }

        loadRain();

        return () => {
            const map = getMapInstance();
            if (!map) return;
            try {
                if (typeof map.getLayer === 'function' && map.getLayer("rain-layer")) map.removeLayer("rain-layer");
                if (typeof map.getSource === 'function' && map.getSource("rain")) map.removeSource("rain");
            } catch (err) { console.warn(err); }
        };
    }, [visible, mapRef]);

    return null;
}
