import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
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
import FeaturePopup from "./FeaturePopup";
import { useGPSSimulator } from "./GPSSimulator";

import useLocation from "../hooks/useLocation";
import useHeading from "../hooks/useHeading";
import useRouteProgress from "../hooks/useRouteProgress";
import useMapLayers from "../hooks/useMapLayers";
import useMapRoutes from "../hooks/useMapRoutes";
import useZonasRiesgo from "../hooks/useZonasRiesgo";
import useReportes from "../hooks/useReportes";
import useFavoritos from "../hooks/useFavoritos";
import useVoiceNavigation, { generarInstruccion } from "../hooks/useVoiceNavigation";
import useVoice from "../hooks/useVoice";
import useTransport from "../hooks/useTransport";
import useRouteRisk from "../risk-routes/hooks/useRouteRisk";

import useConfigGps from "../config/useConfigGps";
import getVisionCone from "../utils/getVisionCone";
import api from "../../services/api";

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
    "reportes-circle", "reportes-glow", "reportes-symbol",
    "favoritos-circle",
    "zonas-fill",
    "rutas-line-metro", "rutas-line-bus", "rutas-line-cable", "rutas-line-tranvia",
    "paradas-icon",
];

const SVG_ICONS = {
  "stop-metro": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><line x1="12" y1="5" x2="12" y2="3"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></svg>`,
  "stop-bus": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="4"/><rect x="5" y="7" width="14" height="5" rx="1"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>`,
  "stop-cable": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="4" x2="22" y2="4"/><rect x="8" y="6" width="8" height="10" rx="2"/><line x1="12" y1="6" x2="12" y2="16"/></svg>`,
  "stop-tranvia": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="3"/><line x1="4" y1="10" x2="20" y2="10"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><line x1="12" y1="6" x2="12" y2="3"/></svg>`,
  "arrow-bus": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M0 10h14V4l10 8-10 8v-6H0z"/></svg>`,
  "stop-bus-integracion": `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><rect x="6" y="7" width="12" height="9" rx="2"/><rect x="8" y="9" width="8" height="3" rx="1"/><circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/></svg>`,
};

function loadMapIcons(map) {
  Object.entries(SVG_ICONS).forEach(([name, svg]) => {
    if (map.hasImage(name)) return;
    const img = new Image();
    img.onload = () => { try { map.addImage(name, img, { sdf: true }); } catch (e) { /* already added */ } };
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
}

export default function MapMapLibre({ onMapClick, stats, favRefresh } = {}) {
    const [darkMode, setDarkMode] = useState(true);
    const [userMoved, setUserMoved] = useState(false);
    const [following, setFollowing] = useState(true);
    const [cone, setCone] = useState(null);
    const [desviacion, setDesviacion] = useState(false);

    const [showZonas, setShowZonas] = useState(false);
    const [showReportes, setShowReportes] = useState(false);
    const [showFavoritos, setShowFavoritos] = useState(false);
    const [showMetro, setShowMetro] = useState(false);
    const [showBus, setShowBus] = useState(false);
    const [showCable, setShowCable] = useState(false);
    const [showTranvia, setShowTranvia] = useState(false);

    const [viewState, setViewState] = useState({ longitude: -75.5636, latitude: 6.2518, zoom: 15 });
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [clickMarker, setClickMarker] = useState(null)
    const [voiceActive, setVoiceActive] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [destinoNombre, setDestinoNombre] = useState('')
    const { setOnSpeaking } = useVoice();
    useEffect(() => { setOnSpeaking(setIsSpeaking); }, []);
    const mapRef = useRef(null);
    useEffect(() => {
      const map = mapRef.current?.getMap();
      if (map) loadMapIcons(map);
    });

    const { ubicacion, accuracy, cargando } = useLocation();
    const heading = useHeading();

    const layers = useMapLayers();
    const transport = useTransport(true);
    const {
        routeFast, routeSafe, routeInfo,
        routeType, setRouteType,
        transportMode, setTransportMode,
        routeLoading, destination,
        handleSelectDestino, fetchRoutes,
        stepsFast, stepsSafe,
        routeSegments,
        walkingLegs,
    } = useMapRoutes(ubicacion, transport?.data);

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

    const zonas = useZonasRiesgo(true);
    const reportes = useReportes(showReportes);
    const favoritos = useFavoritos(showFavoritos);
    const invalidateFavs = favoritos.invalidate;
    const { geoJson: routeRiskGeoJson } = useRouteRisk(routeCoords, zonas?.data) ?? {}
    const transportStats = useMemo(() => {
        const stns = { rutas_metro: 0, rutas_bus: 0, rutas_cable: 0, rutas_tranvia: 0 };
        if (!transport.data?.features) return stns;
        transport.data.features.forEach(f => {
            if (f.geometry.type === 'Point' && f.properties?.tipo) {
                const t = f.properties.tipo;
                if (t === 'metro') stns.rutas_metro++;
                else if (t === 'bus') stns.rutas_bus++;
                else if (t === 'metro_cable') stns.rutas_cable++;
                else if (t === 'tranvia') stns.rutas_tranvia++;
            }
        });
        return stns;
    }, [transport.data]);
    const mergedStats = useMemo(() => ({ ...stats, ...transportStats }), [stats, transportStats]);
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
    }, [destination, fetchRoutes]);

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
        destination ? [[destination[0], destination[1]], [destination[0], destination[1]]] : null,
        accuracy
    )
    useEffect(() => {
        if (destination && distDestino < ARRIVAL_ZONE_M && distDestino > 0) {
            if (routeInfo?.distance && posActual) {
                api.post('/api/v1/historial-viajes', {
                    origen_nombre: 'Mi ubicación',
                    destino_nombre: destinoNombre || `${destination[0].toFixed(4)}, ${destination[1].toFixed(4)}`,
                    origen_lat: posActual[0],
                    origen_lng: posActual[1],
                    destino_lat: destination[0],
                    destino_lng: destination[1],
                    distancia_km: Math.round(routeInfo.distance / 1000 * 10) / 10,
                    tiempo_min: Math.round(routeInfo.duration / 60),
                    costo_estimado: 0,
                }).catch(() => {})
            }
            handleSelectDestino(null)
        }
    }, [distDestino, destination, routeInfo, posActual, destinoNombre])

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

    const flownFavoritos = useRef(false)

    useEffect(() => {
        if (showFavoritos && !flownFavoritos.current && favoritos?.data?.features?.length > 0) {
            flownFavoritos.current = true
            const map = mapRef.current?.getMap()
            if (!map) return
            const bounds = new maplibregl.LngLatBounds()
            favoritos.data.features.forEach(f => bounds.extend(f.geometry.coordinates))
            map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 1000 })
        }
        if (!showFavoritos) flownFavoritos.current = false
    }, [showFavoritos, favoritos?.data])

    useEffect(() => {
        if (favRefresh > 0) invalidateFavs();
    }, [favRefresh]);

    const toggles = { zonas: showZonas, reportes: showReportes, favoritos: showFavoritos, transport_metro: showMetro, transport_bus: showBus, transport_cable: showCable, transport_tranvia: showTranvia };

    const onToggle = useCallback((layer) => {
        switch (layer) {
            case "zonas": setShowZonas(v => !v); break;
            case "reportes": setShowReportes(v => !v); break;
            case "favoritos": setShowFavoritos(v => !v); break;
            case "transport_metro": setShowMetro(v => !v); break;
            case "transport_bus": setShowBus(v => !v); break;
            case "transport_cable": setShowCable(v => !v); break;
            case "transport_tranvia": setShowTranvia(v => !v); break;
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
            setClickMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat });
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
            else if (lid.startsWith("zonas")) type = "zona";
            else if (lid.startsWith("rutas-")) type = "ruta";
            else if (lid.startsWith("paradas-")) type = "parada";
            setSelectedFeature({ type, properties: f.properties, coordinates: coords });
            return;
        }
        setSelectedFeature(null);
        setClickMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat });
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
            <SearchAddress onSelect={handleSearchSelect} onSelectName={setDestinoNombre} favoritos={favoritos.raw || []} />

            <StatsTogglePanel stats={mergedStats} toggles={toggles} onToggle={onToggle} />

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
                    showMetro={showMetro} showBus={showBus} showCable={showCable} showTranvia={showTranvia}
                    transportMode={transportMode}
                    routeRiskGeoJson={routeRiskGeoJson}
                    showZonas={showZonas}
                    walkingLegs={walkingLegs}
                />

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

                {clickMarker && (
                    <Marker longitude={clickMarker.lng} latitude={clickMarker.lat} anchor="center">
                        <div className="NodeBasic ClickMarker" />
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
                transportMode={transportMode}
                setTransportMode={setTransportMode}
                routeInfo={routeInfo}
                routeLoading={routeLoading}
                fetchRoutes={fetchRoutes}
                routeSegments={routeSegments}
            />

            {routeLoading && <div className="FondoBackground">Calculando rutas...</div>}
            {cargando && <div className="FondoBackground">Activando GPS...</div>}
        </div>
    );
}
