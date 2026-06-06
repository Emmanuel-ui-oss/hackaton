import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Marker, Source, Layer, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import "../css/Map.css";
import "../css/button.css";
import "../css/Hub.css";
import "../css/SearchBar.css";

import SearchAddress from "./SearchAddress";
import RainLayer from "./RainLayer";
import HUD from "./Hub";
import RouteSelector from "./RouteSelector";
import StatsTogglePanel from "./StatsTogglePanel";
import MapControlsPanel from "./MapControlsPanel";

import useLocation from "../hooks/useLocation";
import useHeading from "../hooks/useHeading";
import useRouteProgress from "../hooks/useRouteProgress";
import useMapLayers from "../hooks/useMapLayers";
import useMapRoutes from "../hooks/useMapRoutes";
import useZonasRiesgo from "../hooks/useZonasRiesgo";
import useReportes from "../hooks/useReportes";
import useAlertas from "../hooks/useAlertas";
import useEventosSOS from "../hooks/useEventosSOS";
import useFavoritos from "../hooks/useFavoritos";
import useParadas from "../hooks/useParadas";
import useVoiceNavigation from "../hooks/useVoiceNavigation";

import useConfigGps from "../config/useConfigGps";
import getVisionCone from "../utils/getVisionCone";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY;
const hasValidKey = MAPTILER_KEY && !MAPTILER_KEY.startsWith("get_your_key");

const MAP_STYLES = {
    dark: hasValidKey
        ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
        : "https://demotiles.maplibre.org/style.json",
    light: hasValidKey
        ? `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`
        : "https://demotiles.maplibre.org/style.json",
};

if (!hasValidKey) console.warn("MapLibre: MAPTILER_KEY no configurada → usando demotiles (sin personalización visual)");

const NIVEL_COLORS = {
    CRITICO: "#ff1744", ALTO: "#ffab00", MEDIO: "#2979ff", BAJO: "#00c853",
};

const CUSTOM_LAYERS = [
    "reportes-circle", "reportes-glow",
    "alertas-bg", "alertas-glow", "alertas-icon",
    "favoritos-icon",
    "paradas-glow", "paradas-bg", "paradas-circle", "paradas-dot",
    "lineas-bg", "lineas-fg",
    "zonas-fill",
];

export default function MapMapLibre({ onMapClick, stats } = {}) {
    const [darkMode, setDarkMode] = useState(true);
    const [userMoved, setUserMoved] = useState(false);
    const [following, setFollowing] = useState(true);
    const [cone, setCone] = useState(null);
    const [desviacion, setDesviacion] = useState(false);

    const [showZonas, setShowZonas] = useState(false);
    const [showReportes, setShowReportes] = useState(false);
    const [showAlertas, setShowAlertas] = useState(false);
    const [showSos, setShowSos] = useState(false);
    const [showFavoritos, setShowFavoritos] = useState(false);
    const [showParadas, setShowParadas] = useState(false);

    const [viewState, setViewState] = useState({ longitude: -75.5636, latitude: 6.2518, zoom: 13 });
    const [selectedFeature, setSelectedFeature] = useState(null);
    const mapRef = useRef(null);

    const { ubicacion, accuracy, cargando } = useLocation();
    const heading = useHeading();

    const layers = useMapLayers();
    const {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
    } = useMapRoutes(ubicacion);

    const zonas = useZonasRiesgo(showZonas);
    const reportes = useReportes(showReportes);
    const alertas = useAlertas(showAlertas);
    const sos = useEventosSOS(showSos);
    const favoritos = useFavoritos(showFavoritos);
    const paradas = useParadas(showParadas);

    const activeRoute = routeType === "fast" ? routeFast : routeSafe;
    const routeCoords = useMemo(
        () => activeRoute?.coordinates?.map(([lng, lat]) => [lat, lng]),
        [activeRoute]
    );
    const zonasData = useMemo(() => zonas.data, [zonas.data]);
    const { desviacion: nuevaDesviacion, indiceCercano } = useRouteProgress(ubicacion, routeCoords, accuracy);
    useEffect(() => { setDesviacion(nuevaDesviacion); }, [nuevaDesviacion]);

    const reRuteando = useRef(false);
    const ultimaReRuta = useRef(0);
    useEffect(() => {
        if (!desviacion || !ubicacion || !destination || reRuteando.current) return;
        const ahora = Date.now();
        if (ahora - ultimaReRuta.current < 8000) return;
        ultimaReRuta.current = ahora;
        reRuteando.current = true;
        setDesviacion(false);
        fetchRoutes(destination).finally(() => {
            setTimeout(() => { reRuteando.current = false; }, 5000);
        });
    }, [desviacion]);

    useEffect(() => {
        if (destination) fetchRoutes(destination);
    }, [destination]);

    const ARRIVAL_ZONE_M = 50;
    const routeTrimmed = useMemo(() => {
        if (!activeRoute?.coordinates) return null
        const coords = activeRoute.coordinates
        const start = Math.max(0, indiceCercano - 2)
        return coords.slice(start)
    }, [activeRoute, indiceCercano])

    const routeCompleted = useMemo(() => {
        if (!activeRoute?.coordinates || indiceCercano < 3) return null
        return activeRoute.coordinates.slice(0, indiceCercano)
    }, [activeRoute, indiceCercano])

    const { distanciaAlPuntoMasCercano: distDestino } = useRouteProgress(
        ubicacion,
        destination ? [[destination[0], destination[1]]] : null,
        accuracy
    )
    useEffect(() => {
        if (destination && distDestino < ARRIVAL_ZONE_M && distDestino > 0) {
            handleSelectDestino(null)
        }
    }, [distDestino, destination])

    useEffect(() => {
        const h = new Date().getHours();
        setDarkMode(h >= 19 || h < 7);
    }, []);

    useEffect(() => {
        if (!ubicacion) return;
        setCone(getVisionCone(ubicacion, heading || 0));
    }, [ubicacion, heading]);

    const [voiceActive, setVoiceActive] = useState(false)
    useVoiceNavigation({
        ubicacion,
        routeCoords,
        zonasRiesgo: zonasData,
        activo: voiceActive && !!destination,
        heading,
    })

    const toggles = { zonas: showZonas, reportes: showReportes, alertas: showAlertas, sos: showSos, favoritos: showFavoritos, paradas: showParadas };

    const onToggle = useCallback((layer) => {
        switch (layer) {
            case "zonas": setShowZonas(v => !v); break;
            case "reportes": setShowReportes(v => !v); break;
            case "alertas": setShowAlertas(v => !v); break;
            case "sos": setShowSos(v => !v); break;
            case "favoritos": setShowFavoritos(v => !v); break;
            case "paradas": setShowParadas(v => !v); break;
        }
    }, []);

    const handleMoveStart = useCallback((evt) => {
        if (evt.originalEvent) { setUserMoved(true); setFollowing(false); }
    }, []);

    const handleRecenter = useCallback(() => {
        if (!ubicacion) return;
        setUserMoved(false); setFollowing(true);
        setViewState(prev => ({ ...prev, longitude: ubicacion[1], latitude: ubicacion[0], zoom: 15 }));
    }, [ubicacion]);

    useConfigGps({ ubicacion, setViewState, userMoved });

    const handleSearchSelect = useCallback((pos) => {
        if (!pos) return;
        handleSelectDestino(pos);
        setViewState(prev => ({
            ...prev,
            longitude: pos[1],
            latitude: pos[0],
            zoom: 16,
        }));
    }, [handleSelectDestino]);

    const handleMapClick = useCallback((e) => {
        if (!mapRef.current) return;
        const map = mapRef.current.getMap();
        const existingLayers = CUSTOM_LAYERS.filter(id => map.getLayer(id));
        if (existingLayers.length === 0) {
            setSelectedFeature(null);
            if (onMapClick) onMapClick(e.lngLat);
            return;
        }
        const features = map.queryRenderedFeatures(e.point, { layers: existingLayers });
        if (features.length > 0) {
            const f = features[0];
            const lid = f.layer.id;
            const coords = f.geometry.type === "Point"
                ? f.geometry.coordinates
                : f.geometry.type === "LineString"
                    ? (() => {
                        const pts = f.geometry.coordinates;
                        const s = pts.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
                        return [s[0] / pts.length, s[1] / pts.length];
                    })()
                    : (() => {
                        const ring = f.geometry.coordinates[0];
                        const s = ring.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
                        return [s[0] / ring.length, s[1] / ring.length];
                    })();
            let type = "desconocido";
            if (lid.startsWith("reportes")) type = "reporte";
            else if (lid.startsWith("alertas")) type = "alerta";
            else if (lid.startsWith("favoritos")) type = "favorito";
            else if (lid.startsWith("paradas")) type = "parada";
            else if (lid.startsWith("lineas")) type = "linea";
            else if (lid.startsWith("sos")) type = "sos";
            else if (lid.startsWith("zonas")) type = "zona";
            setSelectedFeature({ type, properties: f.properties, coordinates: coords });
            return;
        }
        setSelectedFeature(null);
        if (onMapClick) onMapClick(e.lngLat);
    }, [onMapClick]);

    return (
        <div className={`Map ${darkMode ? "theme-dark" : "theme-light"}`}>
            <SearchAddress onSelect={handleSearchSelect} />

            <StatsTogglePanel stats={stats} toggles={toggles} onToggle={onToggle} />

            <MapControlsPanel
                darkMode={darkMode} setDarkMode={setDarkMode}
                showTraffic={layers.showTraffic} setShowTraffic={layers.setShowTraffic}
                showRadar={layers.showRadar} setShowRadar={layers.setShowRadar}
                following={following} handleRecenter={handleRecenter}
            />

                        <button
                className={`voice-btn ${voiceActive ? 'voice-btn--on' : ''}`}
                onClick={() => setVoiceActive(v => !v)}
                title="Navegación por voz"
            >
                🔊
            </button>

            <Map
                ref={mapRef}
                {...viewState}
                bearing={heading || 0}
                pitch={45}
                transitionDuration={200}
                onMove={evt => setViewState(evt.viewState)}
                onMoveStart={handleMoveStart}
                onClick={handleMapClick}
                mapStyle={darkMode ? MAP_STYLES.dark : MAP_STYLES.light}
            >
                {layers.showTraffic && TOMTOM_KEY && (
                    <Source id="traffic-tiles" type="raster"
                        tiles={[`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`]}
                        tileSize={256}
                    >
                        <Layer id="traffic-layer" type="raster" paint={{ "raster-opacity": 0.85 }} />
                    </Source>
                )}

                <RainLayer visible={layers.showRadar} />

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

                {zonas.data && (
                    <Source id="zonas" type="geojson" data={zonas.data}>
                        <Layer id="zonas-fill" type="fill"
                            paint={{
                                "fill-color": ["get", "color"],
                                "fill-opacity": ["get", "opacidad"],
                                "fill-outline-color": ["get", "color"],
                            }} />
                    </Source>
                )}

                {reportes.data && (
                    <Source id="reportes" type="geojson" data={reportes.data}>
                        <Layer id="reportes-glow" type="circle"
                            paint={{
                                "circle-radius": 22,
                                "circle-color": ["get", "color"],
                                "circle-opacity": 0.5,
                                "circle-blur": 1,
                            }} />
                        <Layer id="reportes-circle" type="circle"
                            paint={{
                                "circle-radius": 12,
                                "circle-color": ["get", "color"],
                                "circle-opacity": 1,
                                "circle-stroke-width": 3,
                                "circle-stroke-color": "#fff",
                            }} />
                    </Source>
                )}

                {alertas.data && (
                    <Source id="alertas" type="geojson" data={alertas.data}>
                        <Layer id="alertas-glow" type="circle"
                            paint={{
                                "circle-radius": 30,
                                "circle-color": ["match", ["get", "nivel"], "CRITICO", "#ff1744", "ALTO", "#ffab00", "MEDIO", "#2979ff", "#00c853"],
                                "circle-opacity": 0.5,
                                "circle-blur": 1,
                            }} />
                        <Layer id="alertas-bg" type="circle"
                            paint={{
                                "circle-radius": 20,
                                "circle-color": ["match", ["get", "nivel"], "CRITICO", "#ff1744", "ALTO", "#ffab00", "MEDIO", "#2979ff", "#00c853"],
                                "circle-opacity": 1,
                                "circle-stroke-width": 3,
                                "circle-stroke-color": "#fff",
                            }} />
                        <Layer id="alertas-icon" type="symbol"
                            layout={{ "text-field": "!", "text-size": 20 }}
                            paint={{ "text-color": "#fff" }} />
                    </Source>
                )}

                {sos.data && sos.data.features.map(f => (
                    <Marker
                        key={f.properties.id}
                        longitude={f.geometry.coordinates[0]}
                        latitude={f.geometry.coordinates[1]}
                        anchor="center"
                    >
                        <div
                            className="sos-map-marker"
                            onClick={() => setSelectedFeature({
                                type: "sos",
                                properties: f.properties,
                                coordinates: f.geometry.coordinates,
                            })}
                        >
                            <div className="sos-map-pulse"></div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff1744" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                    </Marker>
                ))}

                {favoritos.data && (
                    <Source id="favoritos" type="geojson" data={favoritos.data}>
                        <Layer id="favoritos-icon" type="symbol"
                            layout={{ "text-field": "⭐", "text-size": 28 }}
                            paint={{ "text-color": "#f58220", "text-halo-color": "#fff", "text-halo-width": 3 }} />
                    </Source>
                )}

                {paradas.data && (
                    <Source id="paradas" type="geojson" data={paradas.data}>
                        <Layer id="lineas-bg" type="line"
                            paint={{
                                "line-color": "#000",
                                "line-width": 8,
                                "line-opacity": 0.25,
                                "line-blur": 3,
                            }} />
                        <Layer id="lineas-fg" type="line"
                            paint={{
                                "line-color": ["get", "color"],
                                "line-width": 4,
                                "line-opacity": 0.8,
                            }} />
                        <Layer id="paradas-glow" type="circle"
                            paint={{
                                "circle-radius": 18,
                                "circle-color": ["get", "color"],
                                "circle-opacity": 0.4,
                                "circle-blur": 1,
                            }} />
                        <Layer id="paradas-bg" type="circle"
                            paint={{
                                "circle-radius": 12,
                                "circle-color": "#fff",
                                "circle-opacity": 1,
                            }} />
                        <Layer id="paradas-circle" type="circle"
                            paint={{
                                "circle-radius": 6,
                                "circle-color": "transparent",
                                "circle-stroke-width": 4,
                                "circle-stroke-color": ["get", "color"],
                                "circle-opacity": 1,
                            }} />
                        <Layer id="paradas-dot" type="circle"
                            paint={{
                                "circle-radius": 4,
                                "circle-color": ["get", "color"],
                                "circle-opacity": 1,
                            }} />
                    </Source>
                )}

                {selectedFeature && (
                    <Popup
                        longitude={selectedFeature.coordinates[0]}
                        latitude={selectedFeature.coordinates[1]}
                        onClose={() => setSelectedFeature(null)}
                        closeButton={true}
                        anchor="bottom"
                        offset={10}
                    >
                        <div className="map-popup">
                            {selectedFeature.type === "reporte" && (
                                <>
                                    <div className="map-popup__title">{(selectedFeature.properties.tipo || "").replace(/_/g, " ")}</div>
                                    <div className="map-popup__body">
                                        {selectedFeature.properties.descripcion && <div style={{ marginBottom: 4 }}>{selectedFeature.properties.descripcion}</div>}
                                        {selectedFeature.properties.ubicacion_texto && <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.ubicacion_texto}</div>}
                                        <div style={{ fontSize: 11, marginTop: 4 }}>👍{selectedFeature.properties.votos_positivos} 👎{selectedFeature.properties.votos_negativos}</div>
                                        {selectedFeature.properties.creado && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{new Date(selectedFeature.properties.creado).toLocaleString()}</div>}
                                    </div>
                                </>
                            )}
                            {selectedFeature.type === "alerta" && (
                                <>
                                    <div className="map-popup__title">⚠️ {selectedFeature.properties.nivel}</div>
                                    <div className="map-popup__body">
                                        <div style={{ marginBottom: 4 }}>{selectedFeature.properties.mensaje}</div>
                                        {(selectedFeature.properties.zona_nombre || selectedFeature.properties.comuna) && (
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>
                                                {selectedFeature.properties.zona_nombre}{selectedFeature.properties.zona_nombre && selectedFeature.properties.comuna ? " · " : ""}{selectedFeature.properties.comuna}
                                            </div>
                                        )}
                                        {selectedFeature.properties.creado && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{new Date(selectedFeature.properties.creado).toLocaleString()}</div>}
                                    </div>
                                </>
                            )}
                            {selectedFeature.type === "zona" && (
                                <>
                                    <div className="map-popup__title">{selectedFeature.properties.nombre}</div>
                                    <div className="map-popup__body">
                                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{selectedFeature.properties.nivel} · {selectedFeature.properties.tipo_riesgo}</div>
                                        {selectedFeature.properties.comuna && <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{selectedFeature.properties.comuna}</div>}
                                        {selectedFeature.properties.descripcion && <div>{selectedFeature.properties.descripcion}</div>}
                                        {selectedFeature.properties.radio_metros > 0 && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Radio: {selectedFeature.properties.radio_metros}m</div>}
                                    </div>
                                </>
                            )}
                            {selectedFeature.type === "favorito" && (
                                <>
                                    <div className="map-popup__title">{selectedFeature.properties.nombre}</div>
                                    {selectedFeature.properties.direccion && <div className="map-popup__body">{selectedFeature.properties.direccion}</div>}
                                </>
                            )}
                            {selectedFeature.type === "parada" && (
                                <>
                                    <div className="map-popup__title">{selectedFeature.properties.nombre}</div>
                                    <div className="map-popup__body">
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.linea}{selectedFeature.properties.orden > 0 ? ` · Parada #${selectedFeature.properties.orden}` : ""}</div>
                                    </div>
                                </>
                            )}
                            {selectedFeature.type === "linea" && (
                                <>
                                    <div className="map-popup__title">{selectedFeature.properties.linea}</div>
                                    <div className="map-popup__body">
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>Línea de transporte</div>
                                    </div>
                                </>
                            )}
                            {selectedFeature.type === "sos" && (
                                <>
                                    <div className="map-popup__title">🆘 SOS</div>
                                    <div className="map-popup__body">
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>{selectedFeature.properties.nombre_completo}</div>
                                        {selectedFeature.properties.creado && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{new Date(selectedFeature.properties.creado).toLocaleString()}</div>}
                                    </div>
                                </>
                            )}
                        </div>
                    </Popup>
                )}

                {ubicacion && (
                    <Marker longitude={ubicacion[1]} latitude={ubicacion[0]} anchor="center">
                        <div className="NodeBasic User" />
                    </Marker>
                )}

                {destination && (
                    <Marker longitude={destination[1]} latitude={destination[0]} anchor="bottom">
                        <div className="NodeBasic Destiny" />
                    </Marker>
                )}
            </Map>

            {destination && <HUD desviacion={desviacion} routeInfo={routeInfo} />}

            <RouteSelector
                routeType={routeType}
                setRouteType={setRouteType}
                routeFast={routeFast}
                routeSafe={routeSafe}
                destination={destination}
            />

            {routeLoading && <div className="FondoBackground">Calculando rutas...</div>}
            {cargando && <div className="FondoBackground">Activando GPS...</div>}
        </div>
    );
}
