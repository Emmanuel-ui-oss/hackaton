import { useState, useEffect, useRef } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

const WSG84_BOUNDS = [
  [-76.6, 5.1],
  [-74.3, 5.1],
  [-74.3, 7.3],
  [-76.6, 7.3],
];

const REFRESH_MS = 300000;

export default function SiataRadarLayer({ visible }) {
  const [url, setUrl] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setUrl(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    function updateUrl() {
      setUrl(`/api/v1/proxy/siata/radar?t=${Date.now()}`);
    }

    updateUrl();
    intervalRef.current = setInterval(updateUrl, REFRESH_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible]);

  if (!visible || !url) return null;

  return (
    <Source id="siata-radar" type="image" url={url} coordinates={WSG84_BOUNDS}>
      <Layer
        id="siata-radar-layer"
        type="raster"
        paint={{ "raster-opacity": 0.7 }}
      />
    </Source>
  );
}
