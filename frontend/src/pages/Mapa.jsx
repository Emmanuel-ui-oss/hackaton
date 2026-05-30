import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import AnimatedNumber from '../components/common/AnimatedNumber'
import './Mapa.css'

const NIVEL_STYLES = {
  CRITICO: { color: '#ff1744', fill: 'rgba(255,23,68,0.2)', border: 'rgba(255,23,68,0.3)' },
  ALTO:    { color: '#ffab00', fill: 'rgba(255,171,0,0.18)', border: 'rgba(255,171,0,0.3)' },
  MEDIO:   { color: '#2979ff', fill: 'rgba(41,121,255,0.15)', border: 'rgba(41,121,255,0.3)' },
  BAJO:    { color: '#00c853', fill: 'rgba(0,200,83,0.12)', border: 'rgba(0,200,83,0.3)' },
}

const CARD_COLORS = {
  ZONAS: '#ffab00', REPORTES: '#2979ff', ALERTAS: '#ff1744', LINEAS: '#00c853',
  SOS: '#d500f9', FAVORITOS: '#ffab00', PARADAS: '#00bcd4', TOTAL: '#2979ff',
}

const CARD_CONFIG = [
  { key: 'zonas_riesgo', icon: '⚠', label: 'ZONAS RIESGO', colorKey: 'ZONAS' },
  { key: 'reportes_activos', icon: '📋', label: 'REPORTES', colorKey: 'REPORTES' },
  { key: 'alertas_no_leidas', icon: '🔔', label: 'ALERTAS', altKey: 'alertas_enviadas', colorKey: 'ALERTAS' },
  { key: 'lineas_transporte', icon: '🚇', label: 'LINEAS TRANS.', colorKey: 'LINEAS' },
  { key: 'eventos_sos', icon: '🆘', label: 'EVENTOS SOS', colorKey: 'SOS' },
  { key: 'favoritos', icon: '⭐', label: 'FAVORITOS', colorKey: 'FAVORITOS' },
  { key: 'paradas', icon: '📍', label: 'PARADAS', colorKey: 'PARADAS' },
  { key: 'total_reportes', icon: '📊', label: 'TOTAL REPORTES', colorKey: 'TOTAL' },
]

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const OSRM_BASE = 'https://router.project-osrm.org'

const RISK_COLORS = {
  CRITICO: '#ff1744', ALTO: '#ffab00', MEDIO: '#2979ff', BAJO: '#00c853',
}

const RISK_WEIGHTS = { CRITICO: 0.9, ALTO: 0.6, MEDIO: 0.35, BAJO: 0.1 }

const RISK_LABELS = [
  { max: 1, min: 0.7, label: 'CRÍTICO', color: '#ff1744' },
  { max: 0.7, min: 0.4, label: 'ALTO', color: '#ffab00' },
  { max: 0.4, min: 0.2, label: 'MEDIO', color: '#2979ff' },
  { max: 0.2, min: 0, label: 'BAJO', color: '#00c853' },
]

function riskLevel(score) {
  for (const r of RISK_LABELS) if (score >= r.min) return r
  return RISK_LABELS[3]
}

function getRiskColor(score) {
  return riskLevel(score).color
}

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function splitIntoSegments(coords, n) {
  if (coords.length <= n) return [coords]
  const step = Math.floor(coords.length / n), segs = []
  for (let i = 0; i < coords.length; i += step) segs.push(coords.slice(i, i + step + 1))
  return segs
}

function avgRiskForCoords(segCoords, zonas) {
  if (!zonas.length || !segCoords.length) return 0
  let total = 0
  segCoords.forEach(([lat, lng]) => {
    zonas.forEach(z => {
      if (distKm(lat, lng, z.latitud, z.longitud) < (z.radio_metros || 500) / 1000)
        total = Math.max(total, RISK_WEIGHTS[z.nivel] || 0.2)
    })
  })
  return total
}

function riskForPoint(lat, lng, zonas) {
  if (!zonas.length) return 0
  let maxRisk = 0
  zonas.forEach(z => {
    if (distKm(lat, lng, z.latitud, z.longitud) < (z.radio_metros || 500) / 1000)
      maxRisk = Math.max(maxRisk, RISK_WEIGHTS[z.nivel] || 0.2)
  })
  return maxRisk
}

export default function Mapa() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const tileLayerRef = useRef(null)
  const layersRef = useRef({})
  const circlesRef = useRef({})
  const userMarkerRef = useRef(null)
  const userAccuracyRef = useRef(null)
  const routeLayerRef = useRef(null)
  const searchLayerRef = useRef(null)
  const searchTimerRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [weather, setWeather] = useState(null)
  const [ticker, setTicker] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [toggles, setToggles] = useState({ zonas: true, reportes: true, transporte: true })
  const [events, setEvents] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [routeMode, setRouteMode] = useState(false)
  const [routePanelOpen, setRoutePanelOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [routes, setRoutes] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [filters, setFilters] = useState({ evitarCritico: false, evitarAlto: false })
  const [sortMode, setSortMode] = useState('fast')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const socketStats = useSocket().stats
  const { user, logout } = useAuth()
  const { error: showError, info: showInfo } = useToast()
  const navigate = useNavigate()

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, weatherRes] = await Promise.all([
        api.get('/api/v1/stats'),
        api.get('/api/v1/weather').catch(() => null),
      ])
      setStats(statsRes.data)
      setWeather(weatherRes?.data)
    } catch { showError('Error al cargar datos') }
    finally { setDataLoading(false) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  useEffect(() => {
    if (!socketStats || !stats) return
    const changes = []
    CARD_CONFIG.forEach(({ key, altKey }) => {
      const oldV = stats[key] ?? stats[altKey]
      const newV = socketStats[key] ?? socketStats[altKey]
      if (oldV !== undefined && newV !== undefined && oldV !== newV) {
        const dir = newV > oldV ? 'up' : 'down'
        changes.push({ label: key.replace(/_/g, ' '), oldV, newV, dir })
      }
    })
    if (changes.length) {
      setTicker(t => [
        ...changes.map(c => ({ time: new Date().toLocaleTimeString(), ...c })),
        ...t,
      ].slice(0, 30))
    }
    setStats(prev => prev ? { ...prev, ...socketStats } : socketStats)
  }, [socketStats])

  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, { center: [6.2442, -75.5812], zoom: 12, zoomControl: false, attributionControl: false })
    tileLayerRef.current = L.tileLayer(DARK_TILE, { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 200)
    routeLayerRef.current = L.layerGroup().addTo(map)
    searchLayerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current
    setMapLoading(true)

    Promise.all([
      api.get('/api/v1/zonas-riesgo'),
      api.get('/api/v1/reportes'),
      api.get('/api/v1/lineas-transporte'),
      api.get('/api/v1/eventos/near?lat=6.2442&lng=-75.5812&radio_km=20'),
    ]).then(([zonasRes, reportesRes, lineasRes, eventosRes]) => {
      if (!mapInstance.current) return
      Object.values(layersRef.current).forEach(l => l.forEach(ll => map.removeLayer(ll)))
      layersRef.current = { zonas: [], reportes: [], transporte: [] }

      ;(zonasRes.data || []).forEach(z => {
        const s = NIVEL_STYLES[z.nivel] || NIVEL_STYLES.MEDIO
        const circle = L.circle([z.latitud, z.longitud], {
          radius: z.radio_metros || 500,
          color: s.color, fillColor: s.border, fillOpacity: 0.3, weight: 1.5, className: `zone-${z.nivel?.toLowerCase() || 'bajo'}`,
        })
        circle.bindPopup(`<div style="color:#e0e0e0;font-size:12px"><b style="color:#fff">${z.nombre}</b><br><span style="color:${s.color}">${z.nivel}</span> · ${z.tipo_riesgo}</div>`)
        layersRef.current.zonas.push(circle)
        circlesRef.current[z.id] = { circle, nivel: z.nivel, data: z }
        if (toggles.zonas) circle.addTo(map)
      })

      ;(reportesRes.data || []).forEach(r => {
        const m = L.circleMarker([r.latitud, r.longitud], { radius: 5, color: '#ff1744', fillColor: '#ff1744', fillOpacity: 0.6, weight: 1 })
        m.bindPopup(`<div style="color:#e0e0e0;font-size:12px"><b style="color:#fff">${r.tipo}</b><br>${r.descripcion?.slice(0, 80)}</div>`)
        layersRef.current.reportes.push(m)
        if (toggles.reportes) m.addTo(map)
      })

      ;(lineasRes.data || []).forEach(l => {
        api.get(`/api/v1/lineas-transporte/${l.id}/paradas`).then(paradasRes => {
          const paradas = paradasRes.data || []
          if (paradas.length < 2) return
          const coords = paradas.map(p => [p.latitud, p.longitud])
          const poly = L.polyline(coords, { color: l.color || '#2979ff', weight: 2, opacity: 0.4 })
          layersRef.current.transporte.push(poly)
          if (toggles.transporte) poly.addTo(map)
        }).catch(() => {})
      })

      setEvents(eventosRes.data?.eventos || [])
      setMapLoading(false)
      map.invalidateSize()
    }).catch(() => setMapLoading(false))
  }, [toggles])

  useEffect(() => {
    if (!socketStats?.zonas_updated || !mapInstance.current) return
    socketStats.zonas_updated.forEach(({ id, nivel_nuevo, latitud, longitud, radio_metros }) => {
      const existing = circlesRef.current[id]
      const s = NIVEL_STYLES[nivel_nuevo] || NIVEL_STYLES.BAJO
      if (existing) {
        existing.circle.setStyle({
          color: s.color,
          fillColor: s.border,
          className: `zone-${nivel_nuevo?.toLowerCase() || 'bajo'}`,
        })
        existing.nivel = nivel_nuevo
      } else if (latitud && longitud) {
        const circle = L.circle([latitud, longitud], {
          radius: radio_metros || 500,
          color: s.color,
          fillColor: s.border,
          fillOpacity: 0.3,
          weight: 1.5,
          className: `zone-${nivel_nuevo?.toLowerCase() || 'bajo'}`,
        }).addTo(mapInstance.current)
        circlesRef.current[id] = { circle, nivel: nivel_nuevo, data: { latitud, longitud, radio_metros } }
      }
    })
  }, [socketStats?.zonas_updated])

  useEffect(() => {
    if (!mapInstance.current) return
    const id = navigator.geolocation.watchPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [mapInstance.current])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !userPos) return
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker([userPos.lat, userPos.lng], {
        radius: 6, color: '#2979ff', fillColor: '#2979ff', fillOpacity: 1, weight: 2, className: 'user-loc-marker',
      }).addTo(map)
      userAccuracyRef.current = L.circle([userPos.lat, userPos.lng], {
        radius: userPos.accuracy || 50, color: 'rgba(41,121,255,0.15)', fillColor: 'rgba(41,121,255,0.1)', fillOpacity: 0.3, weight: 1,
      }).addTo(map)
    } else {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng])
      userAccuracyRef.current.setLatLng([userPos.lat, userPos.lng])
      userAccuracyRef.current.setRadius(userPos.accuracy || 50)
    }
  }, [userPos])

  const toggleRouteMode = () => {
    const next = !routeMode
    setRouteMode(next)
    setRoutePanelOpen(next)
    if (!next) {
      setRoutes([])
      routeLayerRef.current?.clearLayers()
      tileLayerRef.current?.setUrl(DARK_TILE)
      mapRef.current?.closest('.mapa-wrap')?.style.setProperty('--map-bg', '#0d0d0d')
    }
  }

  useEffect(() => {
    if (!routeMode || !mapInstance.current) return
    tileLayerRef.current?.setUrl(LIGHT_TILE)
    mapRef.current?.closest('.mapa-wrap')?.style.setProperty('--map-bg', '#f5f5f5')
    if (userPos) {
      setOrigin(`Mi ubicación (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`)
    }
  }, [routeMode, userPos])

  const locateMe = () => {
    const map = mapInstance.current
    if (!map) return
    if (userPos) map.setView([userPos.lat, userPos.lng], 15)
    else navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {}
    )
  }

  const toggleLayer = k => setToggles(p => ({ ...p, [k]: !p[k] }))
  const getVal = (s, cfg) => {
    let v = s?.[cfg.key]
    if (v === undefined && cfg.altKey) v = s?.[cfg.altKey]
    return v ?? 0
  }

  const geocode = async (q) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)},Medellín&format=json&limit=1`)
    const data = await res.json()
    if (!data.length) throw new Error(`"${q}" no encontrado en Medellín`)
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name }
  }

  const calcRoute = async () => {
    if (!dest) return
    setRouteLoading(true)
    setRoutes([])
    routeLayerRef.current?.clearLayers()
    try {
      let origC, destC
      if (origin.startsWith('Mi ubicación') && userPos) {
        origC = { lat: userPos.lat, lng: userPos.lng, name: 'Mi ubicación' }
      } else {
        origC = await geocode(origin || 'Mi ubicación, Medellín')
      }
      destC = await geocode(dest)

      const res = await fetch(`${OSRM_BASE}/route/v1/driving/${origC.lng},${origC.lat};${destC.lng},${destC.lat}?overview=full&geometries=geojson&steps=true&alternatives=2`)
      const data = await res.json()
      if (!data.routes?.length) throw new Error('Ruta no encontrada')

      const zonasRes = await api.get('/api/v1/zonas-riesgo').catch(() => ({ data: [] }))
      const zonas = zonasRes.data || []

      const destRisk = riskForPoint(destC.lat, destC.lng, zonas)
      const destRiskLevel = riskLevel(destRisk)

      const mapped = data.routes.map((route, idx) => {
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]])
        const segments = splitIntoSegments(coords, 15)
        const segRisks = segments.map(seg => avgRiskForCoords(seg, zonas))
        const worstRisk = Math.max(...segRisks, 0)
        const worstLevel = riskLevel(worstRisk)
        const critCount = segRisks.filter(r => r >= 0.7).length
        const altoCount = segRisks.filter(r => r >= 0.4 && r < 0.7).length
        return {
          idx,
          coords,
          segments,
          segRisks,
          worstRisk,
          worstLevel,
          critCount,
          altoCount,
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          destRisk,
          destRiskLevel,
        }
      })

      let filtered = [...mapped]
      if (filters.evitarCritico) filtered = filtered.filter(r => r.worstRisk < 0.7)
      if (filters.evitarAlto) filtered = filtered.filter(r => r.worstRisk < 0.4)

      if (sortMode === 'safe') filtered.sort((a, b) => a.worstRisk - b.worstRisk || a.duration - b.duration)
      else filtered.sort((a, b) => a.duration - b.duration || a.worstRisk - b.worstRisk)

      setRoutes(filtered)
      renderRouteOnMap(filtered, zonas, origC, destC)

      const best = filtered[0]
      if (best) {
        const msg = `🚗 Ruta 1: ${best.distance}km · ${best.duration}min · Riesgo ${best.worstLevel.label}${best.critCount ? ` (${best.critCount} críticos)` : ''}${filtered.length > 1 ? `\n🛡️ Ruta 2: ${filtered[1].distance}km · ${filtered[1].duration}min · Riesgo ${filtered[1].worstLevel.label}` : ''}\n📍 Destino: ${destRiskLevel.label}${destRiskLevel.label !== 'BAJO' ? ' - precaución' : ''}`
        showInfo(msg)
      }
    } catch (err) {
      showError(err.message || 'Error al calcular ruta')
    } finally { setRouteLoading(false) }
  }

  const renderRouteOnMap = (routes, zonas, origC, destC) => {
    const map = mapInstance.current
    if (!map) return
    routeLayerRef.current?.clearLayers()

    routes.forEach((r, idx) => {
      const segs = splitIntoSegments(r.coords, 15)
      const risks = segs.map(seg => avgRiskForCoords(seg, zonas))
      segs.forEach((seg, si) => {
        const color = idx === 0 ? getRiskColor(risks[si]) : '#888'
        const poly = L.polyline(seg, {
          color, weight: idx === 0 ? 5 : 3,
          opacity: idx === 0 ? 0.85 : 0.25,
          dashArray: idx > 0 ? '4 6' : null,
        }).addTo(routeLayerRef.current)
      })

      if (idx === 0) {
        L.marker([origC.lat, origC.lng], {
          icon: L.divIcon({ html: '<div class="ruta-marker ruta-marker-o">A</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
        }).addTo(routeLayerRef.current)
        L.marker([destC.lat, destC.lng], {
          icon: L.divIcon({ html: '<div class="ruta-marker ruta-marker-d">B</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
        }).addTo(routeLayerRef.current)
        map.fitBounds(L.latLngBounds(r.coords), { padding: [50, 50] })
      }
    })
  }

  // ── Search ──
  const searchAddress = (q) => {
    if (!q || q.length < 3) { setSearchSuggestions([]); return }
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)},Medellín,Colombia&format=json&limit=8&addressdetails=1`)
      .then(r => r.json())
      .then(data => setSearchSuggestions(Array.isArray(data) ? data : []))
      .catch(() => setSearchSuggestions([]))
  }

  const handleSearchChange = (e) => {
    const v = e.target.value
    setSearchQuery(v)
    setShowSuggestions(true)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => searchAddress(v), 300)
  }

  const selectSuggestion = (s) => {
    const lat = parseFloat(s.lat), lng = parseFloat(s.lon)
    const name = s.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    setSearchQuery(s.display_name?.split(',')[0] || name)
    setShowSuggestions(false)
    setSearchSuggestions([])
    setSearchHistory(prev => {
      const next = [{ name, lat, lng }, ...prev.filter(h => h.name !== name)].slice(0, 5)
      return next
    })

    searchLayerRef.current?.clearLayers()
    const map = mapInstance.current
    if (!map) return

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `<div class="search-marker"><span>📍</span><div class="search-marker-label">${s.display_name?.split(',')[0] || name}</div></div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 24],
      }),
    }).addTo(searchLayerRef.current)
    marker.bindPopup(`
      <div class="search-popup">
        <div class="search-popup-addr">${s.display_name || name}</div>
        <button class="search-popup-btn" data-lat="${lat}" data-lng="${lng}" data-name="${(s.display_name?.split(',')[0] || name).replace(/"/g, '&quot;')}">📍 Como llegar</button>
      </div>
    `)
    marker.on('popupopen', () => {
      const btn = document.querySelector('.search-popup-btn')
      if (btn) btn.onclick = () => {
        const name = btn.dataset.name
        setDest(name)
        setRouteMode(true)
        setRoutePanelOpen(true)
        if (userPos) setOrigin(`Mi ubicación (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`)
      }
    })
    marker.openPopup()
    map.setView([lat, lng], 16)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchSuggestions([])
    setShowSuggestions(false)
    searchLayerRef.current?.clearLayers()
  }

  // ── Map click → reverse geocode ──
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const handler = async (e) => {
      const { lat, lng } = e.latlng
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        const data = await res.json()
        const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        const shortName = addr.split(',')[0]

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div class="search-marker search-marker-click"><span>📍</span></div>`,
            className: '', iconSize: [24, 24], iconAnchor: [12, 24],
          }),
        }).addTo(searchLayerRef.current)

        marker.bindPopup(`
          <div class="search-popup">
            <div class="search-popup-addr">${addr}</div>
            <button class="search-popup-btn" data-lat="${lat}" data-lng="${lng}" data-name="${shortName.replace(/"/g, '&quot;')}">📍 Como llegar</button>
          </div>
        `)
        marker.on('popupopen', () => {
          const btn = document.querySelector('.search-popup-btn')
          if (btn) btn.onclick = () => {
            const name = btn.dataset.name
            setDest(name)
            setRouteMode(true)
            setRoutePanelOpen(true)
            if (userPos) setOrigin(`Mi ubicación (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`)
          }
        })
        marker.openPopup()
      } catch {}
    }
    map.on('click', handler)
    return () => map.off('click', handler)
  }, [mapInstance.current, userPos])

  const ss = stats || {}

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="mapa-wrap">
        <div className="dash-topbar">
          <div className="dash-top-left">
            {weather && (
              <div className="dash-weather">
                <span>🌤️ {weather.temp}°C</span>
                <span className="ws-sep">·</span>
                <span>{weather.condition}</span>
                <span className="ws-sep">·</span>
                <span>💧 {weather.humidity}%</span>
                <span className="ws-sep">·</span>
                <span>🌧️ {weather.rain_prob}%</span>
              </div>
            )}
          </div>
          <div className="dash-top-right">
            <button className="dash-btn" onClick={() => mapInstance.current?.setView([6.2442, -75.5812], 12)} title="Centrar mapa">🎯</button>
            <button className="dash-btn" onClick={locateMe} title="Mi ubicación">📍</button>
            <div className="dash-user" onClick={() => navigate('/perfil')}>
              <span className="dash-avatar">{user?.username?.[0]?.toUpperCase()}</span>
              <span className="dash-username">{user?.username}</span>
            </div>
            <button className="dash-btn dash-btn-logout" onClick={() => { logout(); navigate('/login') }}>Salir</button>
          </div>
        </div>

        <div className="dash-stats">
          {CARD_CONFIG.map(cfg => (
            <div key={cfg.key} className="stat-ticker" style={{ borderTopColor: CARD_COLORS[cfg.colorKey] }}>
              <div className="stat-icon-label">
                <span>{cfg.icon}</span>
                <span className="stat-label">{cfg.label}</span>
              </div>
              <div className="stat-value" style={{ color: CARD_COLORS[cfg.colorKey] }}>
                <AnimatedNumber value={getVal(ss, cfg)} />
              </div>
            </div>
          ))}
        </div>

        <div className="mapa-bar">
          <div className="mapa-bar-left"><h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>🗺️ Mapa</h2></div>
        </div>
        <div className="mapa-layers">
          {[{ k: 'zonas', l: 'Zonas' }, { k: 'reportes', l: 'Reportes' }, { k: 'transporte', l: 'Transporte' }].map(({ k, l }) => (
            <label key={k} className={`mapa-tag ${toggles[k] ? 'active' : ''}`} onClick={() => toggleLayer(k)}>{l}</label>
          ))}
          <label className={`mapa-tag ${routeMode ? 'active' : ''}`} onClick={toggleRouteMode}>🚗 Ruta</label>
        </div>

        <div className="mapa-search">
          <div className="mapa-search-input-wrap">
            <span className="mapa-search-icon">🔍</span>
            <input className="mapa-search-input" placeholder="Buscar dirección en Medellín..." value={searchQuery}
              onChange={handleSearchChange} onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)} />
            {searchQuery && <button className="mapa-search-clear" onClick={clearSearch}>✕</button>}
          </div>
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="mapa-suggestions">
              {searchSuggestions.map((s, i) => (
                <div key={i} className="mapa-suggestion-item" onMouseDown={() => selectSuggestion(s)}>
                  <span className="ms-icon">📍</span>
                  <div className="ms-text">
                    <span className="ms-name">{s.display_name?.split(',')[0]}</span>
                    <span className="ms-detail">{s.display_name?.split(',').slice(1, 4).join(',').trim()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSuggestions && !searchSuggestions.length && searchQuery.length >= 3 && (
            <div className="mapa-suggestions mapa-suggestions-empty">
              <span>Buscando direcciones...</span>
            </div>
          )}
          {showSuggestions && searchQuery.length === 0 && searchHistory.length > 0 && (
            <div className="mapa-suggestions">
              <div className="ms-history-title">Recientes</div>
              {searchHistory.map((h, i) => (
                <div key={i} className="mapa-suggestion-item" onMouseDown={() => {
                  setSearchQuery(h.name)
                  setShowSuggestions(false)
                  searchLayerRef.current?.clearLayers()
                  const map = mapInstance.current
                  if (!map) return
                  L.marker([h.lat, h.lng], {
                    icon: L.divIcon({
                      html: `<div class="search-marker"><span>📍</span></div>`,
                      className: '', iconSize: [24, 24], iconAnchor: [12, 24],
                    }),
                  }).addTo(searchLayerRef.current)
                  map.setView([h.lat, h.lng], 16)
                }}>
                  <span className="ms-icon">🕐</span>
                  <div className="ms-text">
                    <span className="ms-name">{h.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={mapRef} className="mapa-leaflet" />
        {mapLoading && <div className="mapa-loading"><div className="spinner" /></div>}

        {routePanelOpen && (
          <div className="ruteo-panel">
            <div className="ruteo-header">
              <span>Planificar Ruta</span>
              <button className="ruteo-close" onClick={toggleRouteMode}>✕</button>
            </div>

            <div className="ruteo-inputs">
              <div className="ruteo-field">
                <span className="ruteo-icon">📍</span>
                <input className="ruteo-input" placeholder="Desde (o usa GPS)" value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && calcRoute()} />
                {userPos && <button className="ruteo-gps" onClick={() => setOrigin(`Mi ubicación (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`)} title="Usar mi ubicación">📡</button>}
              </div>
              <div className="ruteo-field">
                <span className="ruteo-icon">🎯</span>
                <input className="ruteo-input" placeholder="Destino en Medellín" value={dest}
                  onChange={e => setDest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && calcRoute()} />
                <button className="ruteo-go" onClick={calcRoute} disabled={routeLoading || !dest}>
                  {routeLoading ? '...' : '›'}
                </button>
              </div>
            </div>

            {routes.length > 0 && (
              <>
                <div className="ruteo-filters">
                  <label className={`ruteo-filter-tag ${filters.evitarCritico ? 'active' : ''}`}
                    onClick={() => setFilters(p => ({ ...p, evitarCritico: !p.evitarCritico }))}>
                    🚫 Crítico
                  </label>
                  <label className={`ruteo-filter-tag ${filters.evitarAlto ? 'active' : ''}`}
                    onClick={() => setFilters(p => ({ ...p, evitarAlto: !p.evitarAlto }))}>
                    🚫 Alto
                  </label>
                  <label className={`ruteo-filter-tag ${sortMode === 'fast' ? 'active' : ''}`}
                    onClick={() => setSortMode('fast')}>⚡ Rápido</label>
                  <label className={`ruteo-filter-tag ${sortMode === 'safe' ? 'active' : ''}`}
                    onClick={() => setSortMode('safe')}>🛡️ Seguro</label>
                </div>

                <div className="ruteo-results">
                  {routes.map((r, i) => (
                    <div key={i} className={`ruteo-result ${i === 0 ? 'primary' : ''}`}
                      onClick={() => {
                        const map = mapInstance.current
                        if (map) map.fitBounds(L.latLngBounds(r.coords), { padding: [50, 50] })
                      }}>
                      <div className="rr-top">
                        <span className="rr-label">Ruta {i + 1}</span>
                        <span className="rr-dist">{r.distance} km · {r.duration} min</span>
                      </div>
                      <div className="rr-riskbar">
                        {r.segRisks.map((risk, si) => (
                          <span key={si} className="rr-block" style={{ background: getRiskColor(risk) }} />
                        ))}
                      </div>
                      <div className="rr-bottom">
                        <span className="rr-risk" style={{ color: r.worstLevel.color }}>
                          {r.worstLevel.label === 'CRÍTICO' ? '🔴' : r.worstLevel.label === 'ALTO' ? '🟡' : r.worstLevel.label === 'MEDIO' ? '🔵' : '🟢'}
                          {' '}Riesgo: {r.worstLevel.label}{r.critCount ? ` (${r.critCount} críticos)` : ''}
                        </span>
                        <span className="rr-dest" style={{ color: r.destRiskLevel.color }}>
                          Destino: {r.destRiskLevel.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ruteo-legend">
                  {[
                    { label: 'CRÍTICO', color: '#ff1744' },
                    { label: 'ALTO', color: '#ffab00' },
                    { label: 'MEDIO', color: '#2979ff' },
                    { label: 'BAJO', color: '#00c853' },
                  ].map(({ label, color }) => (
                    <div key={label} className="rl-item">
                      <span style={{ background: color }} />{label}
                    </div>
                  ))}
                </div>
              </>
            )}

            {routeLoading && <div className="ruteo-loading"><div className="spinner" /></div>}
          </div>
        )}

        <div className="dash-riskbar">
          {Object.entries(NIVEL_STYLES).map(([nivel, style]) => {
            const count = stats?.zonas_por_nivel?.[nivel] ?? 0
            return (
              <div key={nivel} className="riskbar-item" style={{ color: style.color }}>
                <span className="riskbar-dot" style={{ background: style.color, boxShadow: `0 0 6px ${style.color}` }} />
                {nivel} <span className="riskbar-count">{count}</span>
              </div>
            )
          })}
        </div>

        <div className="dash-ticker">
          <div className="ticker-title">LIVE TICKER</div>
          {ticker.length === 0 ? (
            <div className="ticker-empty">Esperando cambios...</div>
          ) : (
            ticker.map((t, i) => (
              <div key={i} className="ticker-line">
                <span className="ticker-time">{t.time}</span>
                <span className={`ticker-${t.dir}`}>{(t.dir === 'up' ? '↑' : '↓')}</span>
                <span className="ticker-msg">{t.label}</span>
                <span className="ticker-dir">{t.newV}</span>
              </div>
            ))
          )}
        </div>

        <div className="mapa-legend">
          {Object.entries(NIVEL_STYLES).map(([n, s]) => (
            <div key={n} className="mapa-legend-item"><span style={{ background: s.color }} />{n}</div>
          ))}
        </div>
        {events.length > 0 && (
          <div className="mapa-events">
            <div className="mapa-events-title">Eventos ({events.length})</div>
            {events.slice(0, 4).map(e => (
              <div key={e.id} className="mapa-event-item">
                <span className={`badge badge-${e.nivel?.toLowerCase()}`}>{e.nivel}</span>
                {e.titulo?.slice(0, 25)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
