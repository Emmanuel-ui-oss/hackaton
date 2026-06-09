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
import useEventosSOS from "../hooks/useEventosSOS";
import useFavoritos from "../hooks/useFavoritos";
import useVoiceNavigation, { generarInstruccion } from "../hooks/useVoiceNavigation";
import useVoice from "../hooks/useVoice";
import useTransport from "../hooks/useTransport";

import useConfigGps from "../config/useConfigGps";
import getVisionCone from "../utils/getVisionCone";

function haversine(a, b) {
    const R = 6371000;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const sinDLat = Math.sin(dLat / 2), sinDLng = Math.sin(dLng / 2);
    const s = sinDLat * sinDLat + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * sinDLng * sinDLng;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY;
const hasValidKey = MAPTILER_KEY && !MAPTILER_KEY.startsWith("get_your_key");

const MAP_STYLES = {
    dark: hasValidKey
        ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
        : "https://demotiles.maplibre.org/style.json",
    light: hasValidKey
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
        : "https://demotiles.maplibre.org/style.json",
};

if (!hasValidKey) console.warn("MapLibre: MAPTILER_KEY no configurada → usando demotiles (sin personalización visual)");

const NIVEL_COLORS = {
    CRITICO: "#ff1744", ALTO: "#ffab00", MEDIO: "#2979ff", BAJO: "#00c853",
};

const CUSTOM_LAYERS = [
    "reportes-circle", "reportes-glow",
    "favoritos-icon",
    "zonas-fill",
    "rutas-line-metro", "rutas-line-bus", "rutas-line-cable",
    "paradas-icon",
];

const SVG_ICONS = {
  "stop-metro": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><line x1="12" y1="5" x2="12" y2="3"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></svg>`,
  "stop-bus": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="4"/><rect x="5" y="7" width="14" height="5" rx="1"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>`,
  "stop-cable": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="4" x2="22" y2="4"/><rect x="8" y="6" width="8" height="10" rx="2"/><line x1="12" y1="6" x2="12" y2="16"/></svg>`,
};

function loadMapIcons(map) {
  Object.entries(SVG_ICONS).forEach(([name, svg]) => {
    if (map.hasImage(name)) return;
    const img = new Image();
    img.onload = () => { try { map.addImage(name, img, { sdf: true }); } catch (e) { /* already added */ } };
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
}

export default function MapMapLibre({ onMapClick, stats } = {}) {
    const [darkMode, setDarkMode] = useState(true);
    const [userMoved, setUserMoved] = useState(false);
    const [following, setFollowing] = useState(true);
    const [cone, setCone] = useState(null);
    const [desviacion, setDesviacion] = useState(false);

    const [showZonas, setShowZonas] = useState(false);
    const [showReportes, setShowReportes] = useState(false);
    const [showSos, setShowSos] = useState(false);
    const [showFavoritos, setShowFavoritos] = useState(false);
    const [showMetro, setShowMetro] = useState(false);
    const [showBus, setShowBus] = useState(false);
    const [showCable, setShowCable] = useState(false);

    const [viewState, setViewState] = useState({ longitude: -75.5636, latitude: 6.2518, zoom: 15 });
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [voiceActive, setVoiceActive] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const { setOnSpeaking } = useVoice();
    useEffect(() => { setOnSpeaking(setIsSpeaking); }, []);
    const mapRef = useRef(null);

    const { ubicacion, accuracy, cargando } = useLocation();
    const heading = useHeading();

    const layers = useMapLayers();
    const {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
        stepsFast, stepsSafe,
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
    const sos = useEventosSOS(showSos);
    const favoritos = useFavoritos(showFavoritos);
    const transport = useTransport(showMetro || showBus || showCable);
    const zonasData = useMemo(() => zonas.data, [zonas.data]);
    const { desviacion: nuevaDesviacion, indiceCercano } = useRouteProgress(posActual, routeCoords, accuracy);
    useEffect(() => { setDesviacion(nuevaDesviacion); }, [nuevaDesviacion]);

    const [distanciaRestante, setDistanciaRestante] = useState(null);
    const [tiempoRestante, setTiempoRestante] = useState(null);

    useEffect(() => {
        console.log("Zoom actual:", viewState.zoom);
    }, [viewState.zoom]);

    useEffect(() => {
        if (!routeCoords || !routeInfo?.distance || !posActual) {
            setDistanciaRestante(null);
            setTiempoRestante(null);
            return;
        }
        const start = Math.max(0, indiceCercano);
        let resto = 0;
        for (let i = start; i < routeCoords.length - 1; i++) {
            resto += haversine(routeCoords[i], routeCoords[i + 1]);
        }
        setDistanciaRestante(resto);
        setTiempoRestante(routeInfo.duration * (resto / routeInfo.distance));
    }, [routeCoords, routeInfo, posActual, indiceCercano]);

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

    const activeSteps = routeType === "fast" ? stepsFast : stepsSafe;
    useVoiceNavigation({
        ubicacion: posActual,
        routeCoords,
        steps: activeSteps,
        zonasRiesgo: zonasData,
        activo: voiceActive && !!destination,
        routeInfo,
    })

    const toggles = { zonas: showZonas, reportes: showReportes, sos: showSos, favoritos: showFavoritos, transport_metro: showMetro, transport_bus: showBus, transport_cable: showCable };

    const onToggle = useCallback((layer) => {
        switch (layer) {
            case "zonas": setShowZonas(v => !v); break;
            case "reportes": setShowReportes(v => !v); break;
            case "sos": setShowSos(v => !v); break;
            case "favoritos": setShowFavoritos(v => !v); break;
            case "transport_metro": setShowMetro(v => !v); break;
            case "transport_bus": setShowBus(v => !v); break;
            case "transport_cable": setShowCable(v => !v); break;
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
            zoom: 15,
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
            else if (lid.startsWith("favoritos")) type = "favorito";
            else if (lid.startsWith("sos")) type = "sos";
            else if (lid.startsWith("zonas")) type = "zona";
            else if (lid.startsWith("rutas-")) type = "ruta";
            else if (lid.startsWith("paradas-")) type = "parada";
            setSelectedFeature({ type, properties: f.properties, coordinates: coords });
            return;
        }
        setSelectedFeature(null);
        if (onMapClick) onMapClick(e.lngLat);
    }, [onMapClick]);

    const handleVoiceToggle = useCallback(() => {
        const nuevo = !voiceActive;
        setVoiceActive(nuevo);
        if (nuevo && window.speechSynthesis) {
            const synth = window.speechSynthesis;
            synth.cancel();
            let texto = 'Navegación por voz activada';
            const primerPaso = activeSteps?.[0];
            if (primerPaso) {
                const instruccion = generarInstruccion(primerPaso);
                if (!instruccion.startsWith('Inicie')) {
                    texto += `. ${instruccion}`;
                } else if (activeSteps?.[1]) {
                    texto += `. ${generarInstruccion(activeSteps[1])}`;
                }
            }
            const u = new SpeechSynthesisUtterance(texto);
            const voces = synth.getVoices();
            const voz = voces.find(v => v.lang.startsWith('es-CO'))
                || voces.find(v => v.lang.startsWith('es'))
                || null;
            if (voz) { u.voice = voz; u.lang = voz.lang; }
            else { u.lang = 'es-CO'; }
            u.rate = 0.82;
            synth.speak(u);
        }
    }, [voiceActive, activeSteps]);

    return (
        <div className={`Map ${darkMode ? "theme-dark" : "theme-light"}`}>
            <SearchAddress onSelect={handleSearchSelect} />

            <StatsTogglePanel stats={stats} toggles={toggles} onToggle={onToggle} />

            <MapControlsPanel
                darkMode={darkMode} setDarkMode={setDarkMode}
                showTraffic={layers.showTraffic} setShowTraffic={layers.setShowTraffic}
                showRadar={layers.showRadar} setShowRadar={layers.setShowRadar}
                following={following} handleRecenter={handleRecenter}
                voiceActive={voiceActive} onVoiceToggle={handleVoiceToggle} isSpeaking={isSpeaking}
                simActivo={simActivo} onSimToggle={simToggle} puedeSimular={puedeSimular}
            />

            <Map
                ref={mapRef}
                {...viewState}
                bearing={simBearing || heading || 0}
                pitch={simActivo ? 60 : 45}
                transitionDuration={simActivo ? 800 : 200}
                onMove={evt => setViewState(evt.viewState)}
                onMoveStart={handleMoveStart}
                onClick={handleMapClick}
                onLoad={(e) => loadMapIcons(e.target)}
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
                    favoritos={favoritos}
                    transport={transport}
                    showMetro={showMetro} showBus={showBus} showCable={showCable}
                />

                <MapSOSMarkers sos={sos} onSOSClick={(f) => setSelectedFeature(f)} />

                <FeaturePopup
                    selectedFeature={selectedFeature}
                    onClose={() => setSelectedFeature(null)}
                    darkMode={darkMode}
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

            {destination && <HUD desviacion={desviacion} distanciaRestante={distanciaRestante} tiempoRestante={tiempoRestante} />}

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
