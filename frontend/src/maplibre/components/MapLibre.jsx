import { useState, useEffect, useRef, useCallback } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
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

import useConfigGps from "../config/useConfigGps";
import getVisionCone from "../utils/getVisionCone";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const TOMTOM_KEY   = import.meta.env.VITE_TOMTOM_KEY;
const hasValidKey  = MAPTILER_KEY && !MAPTILER_KEY.startsWith("get_your_key");

const MAP_STYLES = {
    dark:  hasValidKey
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

export default function MapMapLibre({ onMapClick, stats } = {}) {
    const [darkMode,   setDarkMode]   = useState(true);
    const [userMoved,  setUserMoved]  = useState(false);
    const [following,  setFollowing]  = useState(true);
    const [cone,       setCone]       = useState(null);
    const [desviacion, setDesviacion] = useState(false);

    const [showZonas,    setShowZonas]    = useState(false);
    const [showReportes, setShowReportes]  = useState(false);
    const [showAlertas,  setShowAlertas]   = useState(false);
    const [showSos,      setShowSos]       = useState(false);
    const [showFavoritos,setShowFavoritos] = useState(false);
    const [showParadas,  setShowParadas]   = useState(false);

    const [viewState, setViewState] = useState({ longitude: -75.5636, latitude: 6.2518, zoom: 13 });
    const mapRef = useRef(null);

    const { ubicacion, cargando } = useLocation();
    const heading = useHeading();

    const layers = useMapLayers();
    const {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
    } = useMapRoutes(ubicacion);

    const zonas    = useZonasRiesgo(showZonas);
    const reportes = useReportes(showReportes);
    const alertas  = useAlertas(showAlertas);
    const sos      = useEventosSOS(showSos);
    const favoritos= useFavoritos(showFavoritos);
    const paradas  = useParadas(showParadas);

    const activeRoute = routeType === "fast" ? routeFast : routeSafe;
    const routeCoords = activeRoute?.coordinates?.map(([lng, lat]) => [lat, lng]);
    const { desviacion: nuevaDesviacion } = useRouteProgress(ubicacion, routeCoords);
    useEffect(() => { setDesviacion(nuevaDesviacion); }, [nuevaDesviacion]);

    useEffect(() => {
        if (!desviacion || !ubicacion || !destination) return;
        fetchRoutes(destination);
    }, [desviacion]);

    useEffect(() => {
        if (destination) fetchRoutes(destination);
    }, [destination]);

    useEffect(() => {
        const h = new Date().getHours();
        setDarkMode(h >= 19 || h < 7);
    }, []);

    useEffect(() => {
        if (!ubicacion) return;
        setCone(getVisionCone(ubicacion, heading || 0));
    }, [ubicacion, heading]);

    const toggles = { zonas: showZonas, reportes: showReportes, alertas: showAlertas, sos: showSos, favoritos: showFavoritos, paradas: showParadas };

    const onToggle = useCallback((layer) => {
        switch (layer) {
            case "zonas":     setShowZonas(v => !v); break;
            case "reportes":  setShowReportes(v => !v); break;
            case "alertas":   setShowAlertas(v => !v); break;
            case "sos":       setShowSos(v => !v); break;
            case "favoritos": setShowFavoritos(v => !v); break;
            case "paradas":   setShowParadas(v => !v); break;
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

                {destination && routeFast && routeType === "fast" && (
                    <Source id="route-fast" type="geojson" data={{ type: "Feature", geometry: routeFast }}>
                        <Layer id="route-fast-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
                            paint={{ "line-color": "#00d4ff", "line-width": 5, "line-opacity": 0.9 }} />
                    </Source>
                )}

                {destination && routeSafe && routeType === "safe" && (
                    <Source id="route-safe" type="geojson" data={{ type: "Feature", geometry: routeSafe }}>
                        <Layer id="route-safe-line" type="line" layout={{ "line-join": "round", "line-cap": "round" }}
                            paint={{ "line-color": "#00ff88", "line-width": 5, "line-opacity": 0.9 }} />
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
                        <Layer id="reportes-circle" type="circle"
                            paint={{
                                "circle-radius": 5,
                                "circle-color": ["get", "color"],
                                "circle-stroke-width": 1.5,
                                "circle-stroke-color": "#fff",
                                "circle-stroke-opacity": 0.6,
                            }} />
                    </Source>
                )}

                {alertas.data && (
                    <Source id="alertas" type="geojson" data={alertas.data}>
                        <Layer id="alertas-circle" type="circle"
                            paint={{
                                "circle-radius": 6,
                                "circle-color": ["match", ["get", "nivel"], "CRITICO", "#ff1744", "ALTO", "#ffab00", "MEDIO", "#2979ff", "#00c853"],
                                "circle-stroke-width": 1.5,
                                "circle-stroke-color": "#fff",
                                "circle-opacity": 0.85,
                            }} />
                    </Source>
                )}

                {sos.data && (
                    <Source id="sos" type="geojson" data={sos.data}>
                        <Layer id="sos-circle" type="circle"
                            paint={{
                                "circle-radius": 7,
                                "circle-color": "#d500f9",
                                "circle-stroke-width": 2,
                                "circle-stroke-color": "#fff",
                                "circle-opacity": 0.9,
                            }} />
                    </Source>
                )}

                {favoritos.data && (
                    <Source id="favoritos" type="geojson" data={favoritos.data}>
                        <Layer id="favoritos-circle" type="circle"
                            paint={{
                                "circle-radius": 5,
                                "circle-color": "#ffab00",
                                "circle-stroke-width": 1,
                                "circle-stroke-color": "#fff",
                            }} />
                    </Source>
                )}

                {paradas.data && (
                    <Source id="paradas" type="geojson" data={paradas.data}>
                        <Layer id="paradas-circle" type="circle"
                            paint={{
                                "circle-radius": 4,
                                "circle-color": ["get", "color"],
                                "circle-stroke-width": 1,
                                "circle-stroke-color": "#fff",
                                "circle-stroke-opacity": 0.5,
                            }} />
                    </Source>
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
