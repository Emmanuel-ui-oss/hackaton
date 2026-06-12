import { Source, Layer } from "react-map-gl/maplibre"
import RainLayer from "./RainLayer"
import RouteRiskLayer from "../risk-routes/components/RouteRiskLayer"
import RouteRiskLegend from "../risk-routes/components/RouteRiskLegend"

const MODE_COLORS = {
  car: "#00d4ff",
  moto: "#ff6b35",
  transit: "#e30613",
  walking: "#8bc34a",
}

export default function MapDataLayers({
  showTraffic, tomtomKey,
  showRadar,
  cone,
  destination, routeFast, routeSafe, routeType, routeTrimmed, routeCompleted,
  transportMode, routeSegments, routeRiskGeoJson,
  zonas, reportes, favoritos, paradas,
}) {
  return (
    <>
      {showTraffic && tomtomKey && (
        <Source id="traffic-tiles" type="raster"
          tiles={[`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${tomtomKey}`]}
          tileSize={256}
        >
          <Layer id="traffic-layer" type="raster" paint={{ "raster-opacity": 0.85 }} />
        </Source>
      )}

      <RainLayer visible={showRadar} />

      {cone && (
        <Source id="vision" type="geojson" data={{ type: "Feature", geometry: { type: "Polygon", coordinates: [cone] } }}>
          <Layer id="vision-layer" type="fill" paint={{ "fill-color": "#4aa3ff", "fill-opacity": 0.12 }} />
        </Source>
      )}

      {destination && routeTrimmed && routeType === "fast" && (
        <Source id="route-fast" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeTrimmed } }}>
          <Layer id="route-fast-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": MODE_COLORS[transportMode || "car"], "line-width": 5, "line-opacity": 0.9 }} />
        </Source>
      )}

      {destination && routeCompleted && routeType === "fast" && (
        <Source id="route-fast-trail" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeCompleted } }}>
          <Layer id="route-fast-trail-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": MODE_COLORS[transportMode || "car"], "line-width": 4, "line-opacity": 0.15 }} />
        </Source>
      )}

      {destination && routeTrimmed && routeType === "safe" && (
        <Source id="route-safe" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeTrimmed } }}>
          <Layer id="route-safe-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": "#00ff88", "line-width": 5, "line-opacity": 0.9 }} />
        </Source>
      )}

      {destination && routeCompleted && routeType === "safe" && (
        <Source id="route-safe-trail" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeCompleted } }}>
          <Layer id="route-safe-trail-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": "#00ff88", "line-width": 4, "line-opacity": 0.15 }} />
        </Source>
      )}

      {routeRiskGeoJson && (
        <RouteRiskLayer geoJson={routeRiskGeoJson} routeType={routeType} />
      )}
      {routeRiskGeoJson && (
        <RouteRiskLegend visible={true} />
      )}

      {zonas?.data && (
        <Source id="zonas" type="geojson" data={zonas.data}>
          <Layer id="zonas-fill" type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": ["get", "opacidad"],
              "fill-outline-color": ["get", "color"],
            }} />
        </Source>
      )}

      {reportes?.data && (
        <Source id="reportes" type="geojson" data={reportes.data}>
          <Layer id="reportes-glow" type="circle"
            paint={{
              "circle-radius": 22, "circle-color": ["get", "color"],
              "circle-opacity": 0.5, "circle-blur": 1,
            }} />
          <Layer id="reportes-circle" type="circle"
            paint={{
              "circle-radius": 12, "circle-color": ["get", "color"],
              "circle-opacity": 1, "circle-stroke-width": 3, "circle-stroke-color": "#fff",
            }} />
        </Source>
      )}

      {favoritos?.data && (
        <Source id="favoritos" type="geojson" data={favoritos.data}>
          <Layer id="favoritos-icon" type="symbol"
            layout={{ "text-field": "⭐", "text-size": 28 }}
            paint={{ "text-color": "#f58220", "text-halo-color": "#fff", "text-halo-width": 3 }} />
        </Source>
      )}

      {paradas?.data && (
        <Source id="paradas" type="geojson" data={paradas.data}>
          <Layer id="lineas-bg" type="line"
            paint={{ "line-color": "#000", "line-width": 8, "line-opacity": 0.25, "line-blur": 3 }} />
          <Layer id="lineas-fg" type="line"
            paint={{ "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.8 }} />
          <Layer id="paradas-glow" type="circle"
            paint={{ "circle-radius": 18, "circle-color": ["get", "color"], "circle-opacity": 0.4, "circle-blur": 1 }} />
          <Layer id="paradas-bg" type="circle"
            paint={{ "circle-radius": 12, "circle-color": "#fff", "circle-opacity": 1 }} />
          <Layer id="paradas-circle" type="circle"
            paint={{ "circle-radius": 6, "circle-color": "transparent", "circle-stroke-width": 4, "circle-stroke-color": ["get", "color"], "circle-opacity": 1 }} />
          <Layer id="paradas-dot" type="circle"
            paint={{ "circle-radius": 4, "circle-color": ["get", "color"], "circle-opacity": 1 }} />
        </Source>
      )}
    </>
  )
}
