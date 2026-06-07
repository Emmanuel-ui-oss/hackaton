import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import useProgressiveData from '../hooks/useProgressiveData'
import './PlanificarRuta.css'

const GOOGLE_TILES = {
  roadmap: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  hybrid: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
}

const TILE_LABELS = { roadmap: 'Mapa', satellite: 'Satélite', hybrid: 'Híbrido' }

const RISK_COLORS = {
  CRITICO: '#ff1744', ALTO: '#ffab00', MEDIO: '#2979ff', BAJO: '#00c853',
}

function getRiskColor(p) {
  if (p >= 0.7) return RISK_COLORS.CRITICO
  if (p >= 0.4) return RISK_COLORS.ALTO
  if (p >= 0.2) return RISK_COLORS.MEDIO
  return RISK_COLORS.BAJO
}

export default function PlanificarRuta() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const tileLayerRef = useRef(null)
  const routeLayer = useRef(null)
  const originMarker = useRef(null)
  const destMarker = useRef(null)
  const userMarkerRef = useRef(null)
  const pulseRef = useRef(null)
  const watchIdRef = useRef(null)
  const sugsTimeout = useRef(null)
  const routesRef = useRef([])

  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [originSugs, setOriginSugs] = useState([])
  const [destSugs, setDestSugs] = useState([])
  const [focusField, setFocusField] = useState(null)
  const [routes, setRoutes] = useState([])
  const [activeRoute, setActiveRoute] = useState(0)
  const [originCoords, setOriginCoords] = useState(null)
  const [destCoords, setDestCoords] = useState(null)
  const [userCoords, setUserCoords] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [watchingLocation, setWatchingLocation] = useState(false)
  const [tileStyle, setTileStyle] = useState('roadmap')
  const [trafficOn, setTrafficOn] = useState(false)
  const trafficLayer = useRef(null)

  // ── Preload risk zones and traffic (independent, no blocking) ──
  const riskZones = useProgressiveData(() => api.get('/api/v1/public/zonas-riesgo'))
  const traffic = useProgressiveData(() => api.get('/api/v1/trafico/mapa'))

  // ── Map init (immediate) ──
  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, {
      center: [6.2442, -75.5812],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    })
    tileLayerRef.current = L.tileLayer(GOOGLE_TILES.roadmap, { maxZoom: 20 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 200)
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return
    tileLayerRef.current.setUrl(GOOGLE_TILES[tileStyle])
  }, [tileStyle])

  useEffect(() => {
    if (!mapInstance.current) return
    const id = navigator.geolocation.watchPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current)
    }
  }, [])

  const fetchSugs = async (q, setter) => {
    try {
      const res = await api.get('/api/v1/geocode/autocomplete', { params: { q, limit: 5 } })
      const data = res.data
      setter(data.suggestions.map(x => ({ label: x.label, lat: x.lat, lng: x.lng })))
    } catch { setter([]) }
  }

  const doSugs = (val, field, setter) => {
    if (sugsTimeout.current) clearTimeout(sugsTimeout.current)
    if (!val || val.length < 3) { setter([]); return }
    sugsTimeout.current = setTimeout(() => fetchSugs(val, setter), 300)
  }

  useEffect(() => {
    if (focusField !== 'origin') { setOriginSugs([]); return }
    doSugs(origin, 'origin', setOriginSugs)
    return () => { if (sugsTimeout.current) clearTimeout(sugsTimeout.current) }
  }, [origin, focusField])

  useEffect(() => {
    if (focusField !== 'dest') { setDestSugs([]); return }
    doSugs(dest, 'dest', setDestSugs)
    return () => { if (sugsTimeout.current) clearTimeout(sugsTimeout.current) }
  }, [dest, focusField])

  const initMap = () => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, { center: [6.2442, -75.5812], zoom: 12, zoomControl: false })
    tileLayerRef.current = L.tileLayer(GOOGLE_TILES[tileStyle], { maxZoom: 20 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 200)
  }

  const placeUserMarker = (lat, lng) => {
    initMap()
    const map = mapInstance.current
    if (!map) return
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current)
    userMarkerRef.current = L.circleMarker([lat, lng], {
      radius: 8, color: '#2979ff', fillColor: '#2979ff', fillOpacity: 0.35, weight: 3,
    }).addTo(map)
    const pulse = L.circleMarker([lat, lng], {
      radius: 16, color: 'transparent', fillColor: '#2979ff', fillOpacity: 0.12, weight: 0,
    }).addTo(map)
    const animate = () => {
      const r = parseFloat(pulse.getRadius())
      if (r > 28) { pulse.setRadius(16); pulse.setStyle({ fillOpacity: 0.12 }) }
      else { pulse.setRadius(r + 0.4); pulse.setStyle({ fillOpacity: 0.12 - (r - 16) * 0.01 }) }
      pulseRef.current = requestAnimationFrame(animate)
    }
    pulseRef.current = requestAnimationFrame(animate)
    userMarkerRef.current._pulse = pulse
  }

  const reverseGeocode = async (lat, lng) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
        { headers: { 'User-Agent': 'VisionVial/1.0' } }
      )
      const d = await r.json()
      if (d.display_name) {
        const addr = d.display_name.split(',').slice(0, 3).join(',')
        setOrigin(addr)
      }
    } catch (e) { console.warn('Error en geocodificación inversa:', e) }
  }

  const getUserLocation = () => {
    if (!navigator.geolocation) { setGpsError('GPS no disponible en este dispositivo'); return }
    setGpsLoading(true); setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ lat: latitude, lng: longitude })
        initMap()
        const map = mapInstance.current
        placeUserMarker(latitude, longitude)
        placeMarker('origin', latitude, longitude, 'A')
        setOriginCoords({ lat: latitude, lng: longitude })
        setOrigin(`Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
        if (map) map.flyTo([latitude, longitude], 15, { duration: 1.2 })
        reverseGeocode(latitude, longitude)
        setGpsLoading(false)
      },
      (err) => {
        const msgs = { 1: 'Permiso denegado. Actívalo en ajustes del navegador.', 2: 'GPS no disponible. Intenta de nuevo.', 3: 'Solicitud de ubicación agotada.' }
        setGpsError(msgs[err.code] || 'Error al obtener ubicación')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const toggleTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null; setWatchingLocation(false); return
    }
    if (!navigator.geolocation) { setGpsError('GPS no disponible'); return }
    setGpsError(null)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ lat: latitude, lng: longitude })
        placeUserMarker(latitude, longitude)
        placeMarker('origin', latitude, longitude, 'A')
        setOriginCoords({ lat: latitude, lng: longitude })
        reverseGeocode(latitude, longitude)
        const map = mapInstance.current
        if (map) map.flyTo([latitude, longitude], 15, { duration: 0.5 })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
    setWatchingLocation(true)
  }

  const placeMarker = (type, lat, lng, label) => {
    initMap()
    const map = mapInstance.current
    if (!map) return
    const mr = type === 'origin' ? originMarker : destMarker
    if (mr.current) map.removeLayer(mr.current)
    mr.current = L.marker([lat, lng], {
      icon: L.divIcon({ html: `<div class="ruta-marker ruta-marker-${type === 'origin' ? 'o' : 'd'}">${label}</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
    }).addTo(map)
    map.flyTo([lat, lng], 15, { duration: 1 })
  }

  const clearMarkers = (type) => {
    const map = mapInstance.current
    if (!map) return
    if (!type || type === 'origin') { if (originMarker.current) { map.removeLayer(originMarker.current); originMarker.current = null } }
    if (!type || type === 'dest') { if (destMarker.current) { map.removeLayer(destMarker.current); destMarker.current = null } }
  }

  const drawRoutesOnMap = (activeIdx) => {
    const map = mapInstance.current
    if (!map || !routesRef.current.length) return
    if (routeLayer.current) map.removeLayer(routeLayer.current)
    routeLayer.current = L.layerGroup().addTo(map)
    routesRef.current.forEach((r, idx) => {
      const isActive = idx === activeIdx
      r.segments.forEach(seg => {
        L.polyline(seg.coords, {
          color: isActive ? seg.riskColor : '#444',
          weight: isActive ? 5 : 3,
          opacity: isActive ? 0.8 : 0.3,
          dashArray: isActive ? null : '4 6',
        }).addTo(routeLayer.current)
      })
      if (isActive) {
        const coords = r.geometry.coordinates
        L.marker([coords[0][1], coords[0][0]], {
          icon: L.divIcon({ html: '<div class="ruta-marker ruta-marker-o">A</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
        }).addTo(routeLayer.current)
        L.marker([coords[coords.length - 1][1], coords[coords.length - 1][0]], {
          icon: L.divIcon({ html: '<div class="ruta-marker ruta-marker-d">B</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
        }).addTo(routeLayer.current)
      }
    })
    const c = routesRef.current[activeIdx].geometry.coordinates
    map.fitBounds(L.latLngBounds(c.map(p => [p[1], p[0]])), { padding: [40, 40] })
  }

  const switchRoute = (idx) => {
    setActiveRoute(idx)
    drawRoutesOnMap(idx)
  }

  const geocode = async (q) => {
    const res = await api.get('/api/v1/geocode/autocomplete', { params: { q, limit: 1 } })
    const data = res.data
    if (!data.suggestions?.length) throw new Error('No se encontró la dirección en Medellín')
    const s = data.suggestions[0]
    return { lat: s.lat, lng: s.lng }
  }

  const buscarRuta = async () => {
    if (!origin || !dest) return
    setLoading(true)
    setRoutes([])
    clearMarkers()
    try {
      const [origC, destC] = originCoords && destCoords
        ? [originCoords, destCoords]
        : await Promise.all([geocode(origin), geocode(dest)])
      initMap()
      const map = mapInstance.current
      const res = await api.get('/api/v1/routes', {
        params: { olat: origC.lat, olng: origC.lng, dlat: destC.lat, dlng: destC.lng, alternatives: true },
      })
      const routeData = res.data
      if (!routeData.routes?.length) throw new Error('Ruta no encontrada')
      const osrmData = { routes: routeData.routes.map(r => ({
        distance: r.distance_m,
        duration: r.duration_s,
        geometry: { coordinates: r.coords.map(c => [c[1], c[0]]) },
      }))}
      const wazeUrl = routeData.waze_url || `https://waze.com/ul?ll=${destC.lat},${destC.lng}&navigate=yes`
      const zonas = riskZones.data?.zonas || []
      const computed = osrmData.routes.map(route => {
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]])
        const segments = splitIntoSegments(coords, 15).map(seg => ({ coords: seg, avgRisk: avgRiskForCoords(seg, zonas) }))
        const worst = Math.max(...segments.map(s => s.avgRisk))
        return {
          distance: route.distance,
          duration: route.duration,
          segments: segments.map(s => ({ coords: s.coords, avgRisk: s.avgRisk, riskColor: getRiskColor(s.avgRisk) })),
          worstRisk: worst,
          riskLevel: worst >= 0.7 ? 'Alto' : worst >= 0.4 ? 'Medio' : worst >= 0.2 ? 'Bajo' : 'Mínimo',
          riskColor: getRiskColor(worst),
          geometry: route.geometry,
          wazeUrl,
        }
      })
      routesRef.current = computed
      setRoutes(computed)
      setActiveRoute(0)
      drawRoutesOnMap(0)
    } catch (err) {
      alert(err.message || 'Error al buscar ruta')
    } finally { setLoading(false) }
  }

  const locateMe = () => {
    const map = mapInstance.current
    if (!map) return
    if (userCoords) map.setView([userCoords.lat, userCoords.lng], 15)
    else navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {}
    )
  }

  // ── Traffic overlay (independent, updates when trafficOn or traffic.data changes) ──
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    if (!trafficOn) {
      if (trafficLayer.current) { map.removeLayer(trafficLayer.current); trafficLayer.current = null }
      return
    }
    if (!traffic.data?.comunas?.length) return
    if (!trafficLayer.current) {
      trafficLayer.current = L.layerGroup().addTo(map)
    } else {
      trafficLayer.current.clearLayers()
    }
    const layer = trafficLayer.current
    traffic.data.comunas.forEach(c => {
      const colors = { critico: '#ff1744', alto: '#ffab00', medio: '#2979ff', bajo: '#00c853' }
      const fills = { critico: 'rgba(255,23,68,0.35)', alto: 'rgba(255,171,0,0.3)', medio: 'rgba(41,121,255,0.25)', bajo: 'rgba(0,200,83,0.2)' }
      const color = colors[c.nivel] || colors.bajo
      const fill = fills[c.nivel] || fills.bajo
      const circle = L.circle([c.latitud, c.longitud], {
        radius: c.radio_metros, color, fillColor: fill, fillOpacity: 0.4, weight: 2, opacity: 0.6,
      })
      circle.bindPopup(`<div style="color:#e0e0e0;font-size:12px"><b style="color:#fff">${c.nombre}</b><br><span style="color:${color};font-weight:700">${c.probabilidad}% congestión</span></div>`)
      layer.addLayer(circle)
    })
  }, [traffic.data, trafficOn])

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="ruta-wrap">
        <div className="ruta-bar">
          <div className="ruta-inputs">
            <div className="ruta-field">
              <div className="ruta-input-wrap">
                <input className="ruta-input" placeholder="Origen en Medellín" value={origin}
                  onChange={e => { setOrigin(e.target.value); setOriginCoords(null); clearMarkers('origin') }}
                  onFocus={() => setFocusField('origin')}
                  onBlur={() => setTimeout(() => setFocusField(null), 200)}
                  onKeyDown={e => { if (e.key === 'Enter') buscarRuta() }} />
                <button
                  className={`ruta-gps-btn ${gpsLoading ? 'ruta-gps-btn--loading' : ''} ${watchingLocation ? 'ruta-gps-btn--tracking' : ''}`}
                  onClick={getUserLocation}
                  disabled={gpsLoading}
                  title="Usar mi ubicación"
                >
                  {gpsLoading ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="spinner-gps">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  )}
                </button>
              </div>
              {focusField === 'origin' && originSugs.length > 0 && (
                <div className="ruta-sugs">
                  {originSugs.map((s, i) => (
                    <div key={i} className="ruta-sug" onMouseDown={() => {
                      setOrigin(s.label); setOriginSugs([])
                      setOriginCoords({ lat: s.lat, lng: s.lng })
                      placeMarker('origin', s.lat, s.lng, 'A')
                      if (destCoords) {
                        const m = mapInstance.current
                        if (m) m.flyToBounds(L.latLngBounds([s.lat, s.lng], [destCoords.lat, destCoords.lng]), { padding: [40, 40], duration: 1 })
                      }
                      setFocusField('dest')
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:'inline-flex', marginRight: 4}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ruta-field">
              <input className="ruta-input" placeholder="Destino en Medellín" value={dest}
                onChange={e => { setDest(e.target.value); setDestCoords(null); clearMarkers('dest') }}
                onFocus={() => setFocusField('dest')}
                onBlur={() => setTimeout(() => setFocusField(null), 200)}
                onKeyDown={e => { if (e.key === 'Enter') buscarRuta() }} />
              {focusField === 'dest' && destSugs.length > 0 && (
                <div className="ruta-sugs">
                  {destSugs.map((s, i) => (
                    <div key={i} className="ruta-sug" onMouseDown={() => {
                      setDest(s.label); setDestSugs([])
                      setDestCoords({ lat: s.lat, lng: s.lng })
                      placeMarker('dest', s.lat, s.lng, 'B')
                      if (originCoords) {
                        const m = mapInstance.current
                        if (m) m.flyToBounds(L.latLngBounds([originCoords.lat, originCoords.lng], [s.lat, s.lng]), { padding: [40, 40], duration: 1 })
                      }
                      setFocusField(null)
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:'inline-flex', marginRight: 4}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-sm" onClick={buscarRuta} disabled={loading}>
              {loading ? '...' : 'Ir allá'}
            </button>
            <button className="dash-btn ruta-locate-btn" onClick={locateMe} title="Centrar en mi ubicación">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
            </button>
          </div>
          {gpsError && <div className="ruta-gps-error">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:'inline-flex', marginRight: 4}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {gpsError}
          </div>}
        </div>

        <div className="ruta-tile-bar">
          {Object.entries(TILE_LABELS).map(([key, label]) => (
            <label key={key}
              className={`ruta-tile-btn ${tileStyle === key ? 'active' : ''}`}
              onClick={() => setTileStyle(key)}>{label}</label>
          ))}
          <label className={`ruta-tile-btn ${trafficOn ? 'active' : ''}`}
            onClick={() => setTrafficOn(p => !p)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 3, verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Tráfico
          </label>
        </div>

        <div ref={mapRef} className="ruta-map" />

        {trafficOn && traffic.isLoading && (
          <div className="ruta-trafico-legend">
            <span style={{fontSize:'0.55rem',color:'#888'}}>Cargando tráfico...</span>
          </div>
        )}
        {trafficOn && !traffic.isLoading && traffic.data?.comunas?.length > 0 && (
          <div className="ruta-trafico-legend">
            {[
              { l: 'Crítico', c: '#ff1744' },
              { l: 'Alto', c: '#ffab00' },
              { l: 'Medio', c: '#2979ff' },
              { l: 'Bajo', c: '#00c853' },
            ].map(n => (
              <div key={n.l} className="ruta-trafico-item">
                <span style={{ background: n.c }} />{n.l}
              </div>
            ))}
          </div>
        )}

        {routes.length > 0 && (
          <div className="ruta-panel">
            <div className="rp-header">
              <span>Rutas disponibles</span>
              <button
                className={`rp-track-btn ${watchingLocation ? 'rp-track-btn--on' : ''}`}
                onClick={toggleTracking}
                title={watchingLocation ? 'Detener seguimiento GPS' : 'Seguir ubicación en vivo'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={watchingLocation ? '#2979ff' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill={watchingLocation ? '#2979ff' : 'none'} />
                </svg>
              </button>
            </div>
            {routes.map((r, idx) => (
              <div key={idx} className={`rp-card ${idx === activeRoute ? 'rp-active' : ''}`} onClick={() => switchRoute(idx)}>
                <div className="rp-card-top">
                  <span className="rp-route-num">Ruta {idx + 1}</span>
                  {idx === activeRoute && <span className="rp-badge">Activo</span>}
                </div>
                <div className="rp-stats">
                  <div className="rp-stat"><span className="rp-sl">Dist</span><span className="rp-sv">{(r.distance / 1000).toFixed(1)} km</span></div>
                  <div className="rp-stat"><span className="rp-sl">Dur</span><span className="rp-sv">{Math.round(r.duration / 60)} min</span></div>
                  <div className="rp-stat"><span className="rp-sl">Riesgo</span><span className="rp-sv" style={{ color: r.riskColor }}>{r.riskLevel}</span></div>
                  {r.wazeUrl && (
                    <a href={r.wazeUrl} target="_blank" rel="noopener noreferrer" className="rp-waze-btn"
                      onClick={e => e.stopPropagation()} title="Abrir en Waze">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      Waze
                    </a>
                  )}
                </div>
                <div className="rp-risk-bar">
                  {r.segments.map((s, i) => (
                    <div key={i} className="rp-risk-seg" style={{ background: s.riskColor }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="ruta-loading"><div className="spinner" /></div>}
      </div>
    </div>
  )
}

function splitIntoSegments(coords, count) {
  if (coords.length <= count) return [coords]
  const step = Math.floor(coords.length / count)
  const segs = []
  for (let i = 0; i < coords.length; i += step) {
    segs.push(coords.slice(i, i + step + 1))
  }
  return segs
}

function avgRiskForCoords(segCoords, zonas) {
  if (!zonas.length || !segCoords.length) return 0
  const weights = { CRITICO: 0.9, ALTO: 0.6, MEDIO: 0.35, BAJO: 0.1 }
  let total = 0
  segCoords.forEach(([lat, lng]) => {
    zonas.forEach(z => {
      const d = distKm(lat, lng, z.latitud, z.longitud)
      if (d < (z.radio_metros || 500) / 1000) {
        total = Math.max(total, weights[z.nivel] || 0.2)
      }
    })
  })
  return total
}

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
