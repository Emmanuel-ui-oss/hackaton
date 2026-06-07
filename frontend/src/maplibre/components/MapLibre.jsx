import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import "../css/Map.css";
import "../css/button.css";
import "../css/Hub.css";
import "../css/SearchBar.css";

import SearchAddress from "./SearchAddress";
import HUD from "./Hub";
import RouteSelector from "./RouteSelector";
import StatsTogglePanel from "./StatsTogglePanel";
import MapControlsPanel from "./MapControlsPanel";
import MapDataLayers from "./MapDataLayers";
import MapSOSMarkers from "./MapSOSMarkers";
import FeaturePopup from "./FeaturePopup";
import { useGPSSimulator } from "./GPSSimulator";

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
    const [voiceActive, setVoiceActive] = useState(false)
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

    const activeRoute = routeType === "fast" ? routeFast : routeSafe;
    const routeCoords = useMemo(
        () => activeRoute?.coordinates?.map(([lng, lat]) => [lat, lng]),
        [activeRoute]
    );

    const { pos: simPos, bearing: simBearing, activo: simActivo, toggle: simToggle, puedeSimular } = useGPSSimulator(
        routeCoords,
        setViewState
    );
    const posActual = simPos || ubicacion;

    useEffect(() => {
        if (simActivo && !voiceActive) setVoiceActive(true)
    }, [simActivo])

    useEffect(() => {
        if (simActivo) setUserMoved(false)
    }, [simActivo, simPos])

    const zonas = useZonasRiesgo(showZonas);
    const reportes = useReportes(showReportes);
    const alertas = useAlertas(showAlertas);
    const sos = useEventosSOS(showSos);
    const favoritos = useFavoritos(showFavoritos);
    const paradas = useParadas(showParadas);

    const zonasData = useMemo(() => zonas.data, [zonas.data]);
    const { desviacion: nuevaDesviacion, indiceCercano } = useRouteProgress(posActual, routeCoords, accuracy);
    useEffect(() => { setDesviacion(nuevaDesviacion); }, [nuevaDesviacion]);

    const reRuteando = useRef(false);
    const ultimaReRuta = useRef(0);
    useEffect(() => {
        if (!desviacion || !posActual || !destination || reRuteando.current) return;
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
        posActual,
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

    const simBearingFinal = simBearing || heading || 0
    useEffect(() => {
        if (!posActual) return;
        setCone(getVisionCone(posActual, simBearingFinal));
    }, [posActual, simBearingFinal]);

    useVoiceNavigation({
        ubicacion: posActual,
        routeCoords,
        zonasRiesgo: zonasData,
        activo: voiceActive && !!destination,
        heading: simBearing || heading,
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
        if (!posActual) return;
        setUserMoved(false); setFollowing(true);
        setViewState(prev => ({ ...prev, longitude: posActual[1], latitude: posActual[0], zoom: 15 }));
    }, [posActual]);

    useConfigGps({ ubicacion: posActual, setViewState, userMoved, forceFollow: simActivo });

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

            <button
                className={`gps-sim-btn ${simActivo ? 'gps-sim-btn--on' : ''}`}
                onClick={simToggle}
                disabled={!puedeSimular}
                title={!puedeSimular ? 'Busque un destino primero' : simActivo ? 'Detener simulación GPS' : 'Simular GPS'}
            >
                {simActivo ? '⏹' : '▶ Simular'}
            </button>

            <Map
                ref={mapRef}
                {...viewState}
                bearing={simBearing || heading || 0}
                pitch={simActivo ? 60 : 45}
                transitionDuration={simActivo ? 800 : 200}
                onMove={evt => setViewState(evt.viewState)}
                onMoveStart={handleMoveStart}
                onClick={handleMapClick}
                mapStyle={darkMode ? MAP_STYLES.dark : MAP_STYLES.light}
            >
                <MapDataLayers
                    showTraffic={layers.showTraffic}
                    tomtomKey={TOMTOM_KEY}
                    showRadar={layers.showRadar}
                    cone={cone}
                    destination={destination}
                    routeFast={routeFast}
                    routeSafe={routeSafe}
                    routeType={routeType}
                    routeTrimmed={routeTrimmed}
                    routeCompleted={routeCompleted}
                    zonas={zonas}
                    reportes={reportes}
                    alertas={alertas}
                    favoritos={favoritos}
                    paradas={paradas}
                />

                <MapSOSMarkers sos={sos} onSOSClick={(f) => setSelectedFeature(f)} />

                <FeaturePopup
                    selectedFeature={selectedFeature}
                    onClose={() => setSelectedFeature(null)}
                />

                {posActual && (
                    <Marker longitude={posActual[1]} latitude={posActual[0]} anchor="center">
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
