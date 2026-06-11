import { useMemo } from "react"
import { Source, Layer } from "react-map-gl/maplibre"
import RainLayer from "./RainLayer"

export default function MapDataLayers({
  showTraffic, tomtomKey,
  showRadar,
  cone,
  destination, routeFast, routeSafe, routeType, routeTrimmed, routeCompleted,
  zonas, reportes, favoritos,
  transport, showMetro, showBus, showCable, showTranvia,
}) {
  const lineVis = useMemo(() => ({
    metro: showMetro ? "visible" : "none",
    bus: showBus ? "visible" : "none",
    cable: showCable ? "visible" : "none",
    tranvia: showTranvia ? "visible" : "none",
  }), [showMetro, showBus, showCable, showTranvia])
  const tiposActivos = useMemo(() => {
    const t = []
    if (showMetro) t.push("metro")
    if (showBus) t.push("bus")
    if (showCable) t.push("metro_cable")
    if (showTranvia) t.push("tranvia")
    return t
  }, [showMetro, showBus, showCable, showTranvia])
  const paradasFilter = useMemo(() => {
    if (tiposActivos.length === 0) return ["==", "tipo", ""]
    return ["all", ["==", "$type", "Point"], ["in", "tipo", ...tiposActivos]]
  }, [tiposActivos])
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
            paint={{ "line-color": "#00d4ff", "line-width": 5, "line-opacity": 0.9 }} />
        </Source>
      )}

      {destination && routeCompleted && routeType === "fast" && (
        <Source id="route-fast-trail" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeCompleted } }}>
          <Layer id="route-fast-trail-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": "#00d4ff", "line-width": 4, "line-opacity": 0.15 }} />
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

      {transport?.data && (
        <Source id="transport" type="geojson" data={transport.data}>
          <Layer id="rutas-line-metro" type="line"
            filter={["==", "tipo", "metro"]}
            layout={{ "visibility": lineVis.metro, "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": 8,
              "line-opacity": 0.85,
            }} />
          <Layer id="rutas-line-bus" type="line"
            filter={["==", "tipo", "bus"]}
            layout={{ "visibility": lineVis.bus, "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": 4,
              "line-opacity": 0.9,
            }} />
          <Layer id="rutas-line-bus-arrows" type="symbol"
            filter={["==", "tipo", "bus"]}
            layout={{
              "visibility": lineVis.bus,
              "symbol-placement": "line",
              "symbol-spacing": 100,
              "icon-image": "arrow-bus",
              "icon-size": 0.95,
              "icon-allow-overlap": true,
            }}
            paint={{
              "icon-color": ["get", "color"],
              "icon-opacity": 1,
            }} />
          <Layer id="rutas-line-cable" type="line"
            filter={["==", "tipo", "metro_cable"]}
            layout={{ "visibility": lineVis.cable, "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": 8,
              "line-opacity": 0.85,
            }} />
          <Layer id="rutas-line-tranvia" type="line"
            filter={["==", "tipo", "tranvia"]}
            layout={{ "visibility": lineVis.tranvia, "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": 8,
              "line-opacity": 0.85,
            }} />
          <Layer id="paradas-icon" type="symbol"
            filter={paradasFilter}
            layout={{
              "icon-image": [
                "case",
                ["all", ["==", ["get", "tipo"], "bus"], ["==", ["get", "tipo_parada"], "integracion"]],
                "stop-bus-integracion",
                [
                  "match",
                  ["get", "tipo"],
                  "metro", "stop-metro",
                  "bus", "stop-bus",
                  "metro_cable", "stop-cable",
                  "tranvia", "stop-tranvia",
                  "stop-metro"
                ]
              ],
              "icon-size": 0.85,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
            paint={{
              "icon-color": [
                "case",
                ["==", ["get", "tipo"], "bus"],
                ["get", "linea_color"],
                ["get", "linea_color"]
              ],
              "icon-halo-color": "#fff",
              "icon-halo-width": 4,
            }} />
        </Source>
      )}

    </>
  )
}
