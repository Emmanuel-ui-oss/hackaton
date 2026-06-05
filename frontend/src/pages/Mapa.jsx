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
import { Warning, Clipboard, Bell, Train, AlertCircle, Star, MapPin, Chart, CloudRain, Target, Sun, Droplet, Map, ArrowUp, ArrowDown, TrafficLight } from '../icons'

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
  { key: 'zonas_riesgo', icon: Warning, label: 'ZONAS RIESGO', colorKey: 'ZONAS' },
  { key: 'reportes_activos', icon: Clipboard, label: 'REPORTES', colorKey: 'REPORTES' },
  { key: 'alertas_no_leidas', icon: Bell, label: 'ALERTAS', altKey: 'alertas_enviadas', colorKey: 'ALERTAS' },
  { key: 'lineas_transporte', icon: Train, label: 'LINEAS TRANS.', colorKey: 'LINEAS' },
  { key: 'eventos_sos', icon: AlertCircle, label: 'EVENTOS SOS', colorKey: 'SOS' },
  { key: 'favoritos', icon: Star, label: 'FAVORITOS', colorKey: 'FAVORITOS' },
  { key: 'paradas', icon: MapPin, label: 'PARADAS', colorKey: 'PARADAS' },
  { key: 'total_reportes', icon: Chart, label: 'TOTAL REPORTES', colorKey: 'TOTAL' },
]

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

const REPORT_TYPES = [
  { key: 'accidente', label: 'Accidente', color: '#ff1744', icon: AlertCircle },
  { key: 'bloqueo', label: 'Vía bloqueada', color: '#ffab00', icon: Warning },
  { key: 'zona_peligrosa', label: 'Zona peligrosa', color: '#d500f9', icon: Warning },
  { key: 'robo', label: 'Robo / Hurtos', color: '#ff1744', icon: AlertCircle },
  { key: 'clima', label: 'Inundación / Clima', color: '#00bcd4', icon: CloudRain },
  { key: 'otro', label: 'Otro', color: '#9e9e9e', icon: MapPin },
]

const REPORT_ICON_HTML = {
  accidente: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  bloqueo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  zona_peligrosa: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  robo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  clima: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 13v8"/><path d="M8 13v8"/><path d="M12 15v8"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 0 0 4 15.25"/></svg>',
  otro: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
}

const REPORT_COLORS = Object.fromEntries(REPORT_TYPES.map(t => [t.key, t.color]))

export default function Mapa() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const tileLayerRef = useRef(null)
  const layersRef = useRef({})
  const circlesRef = useRef({})
  const userMarkerRef = useRef(null)
  const userAccuracyRef = useRef(null)
  const sosLayerRef = useRef(null)
  const sosMarkersRef = useRef({})
  const trafficLayerRef = useRef(null)
  const [trafficAvailable, setTrafficAvailable] = useState(false)
  const [trafficTileUrl, setTrafficTileUrl] = useState(null)
  const [trafficOn, setTrafficOn] = useState(false)
  const [stats, setStats] = useState(null)
  const [weather, setWeather] = useState(null)
  const [ticker, setTicker] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [toggles, setToggles] = useState({ zonas: true, reportes: true, transporte: true })
  const [events, setEvents] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [userAddress, setUserAddress] = useState('')
  const reportMarkerRef = useRef(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('accidente')
  const [reportDesc, setReportDesc] = useState('')
  const [reportCoords, setReportCoords] = useState(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)
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
    sosLayerRef.current = L.layerGroup().addTo(map)
    api.get('/api/v1/traffic/config').then(r => {
      if (r.data?.available && r.data?.tile_url) {
        setTrafficAvailable(true)
        setTrafficTileUrl(r.data.tile_url)
      }
    }).catch(() => {})
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
        const rc = REPORT_COLORS[r.tipo] || '#ff1744'
        const rt = REPORT_TYPES.find(t => t.key === r.tipo)
        const m = L.circleMarker([r.latitud, r.longitud], { radius: 6, color: rc, fillColor: rc, fillOpacity: 0.5, weight: 2 })
        m.bindPopup(`<div class="report-popup"><div class="report-popup-header" style="color:${rc}">${REPORT_ICON_HTML[rt?.key] || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'} ${rt?.label || r.tipo}</div><div class="report-popup-body">${r.descripcion || 'Sin descripción'}</div><div class="report-popup-footer">${r.usuario_username || 'Anónimo'} · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> ${r.votos_positivos || 0}</div></div>`)
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
    const map = mapInstance.current
    if (!map || !trafficTileUrl) return
    if (trafficOn && !trafficLayerRef.current) {
      trafficLayerRef.current = L.tileLayer(trafficTileUrl, {
        maxZoom: 19, opacity: 0.7, zIndex: 500,
      }).addTo(map)
    } else if (!trafficOn && trafficLayerRef.current) {
      map.removeLayer(trafficLayerRef.current)
      trafficLayerRef.current = null
    }
    return () => {
      if (trafficLayerRef.current && map) {
        map.removeLayer(trafficLayerRef.current)
        trafficLayerRef.current = null
      }
    }
  }, [trafficOn, trafficTileUrl])

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
    if (!mapInstance.current || !sosLayerRef.current) return
    const sosList = socketStats?.sos_activos || []
    const map = mapInstance.current
    const layer = sosLayerRef.current
    const currentIds = new Set(sosList.map(s => s.id))

    Object.keys(sosMarkersRef.current).forEach(id => {
      if (!currentIds.has(Number(id))) {
        layer.removeLayer(sosMarkersRef.current[id])
        delete sosMarkersRef.current[id]
      }
    })

    sosList.forEach(s => {
      if (sosMarkersRef.current[s.id]) {
        sosMarkersRef.current[s.id].setLatLng([s.latitud, s.longitud])
        return
      }
      const icon = L.divIcon({
        html: `<div class="sos-map-marker"><div class="sos-map-pulse"></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff1744" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([s.latitud, s.longitud], { icon }).addTo(layer)
      const tiempo = Math.floor((Date.now() - new Date(s.creado).getTime()) / 1000)
      const mins = Math.floor(tiempo / 60)
      const nombre = s.nombre_completo || s.username
      const email = s.email || ''
      const telefono = s.telefono || ''
      marker.bindPopup(`
        <div class="sos-popup">
          <div class="sos-popup-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff1744" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> SOS ACTIVO</div>
          <div class="sos-popup-body">
            <div class="sos-popup-row"><span class="sos-popup-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></span><span>${nombre}</span></div>
            ${email ? `<div class="sos-popup-row"><span class="sos-popup-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span><span>${email}</span></div>` : ''}
            ${telefono ? `<div class="sos-popup-row"><span class="sos-popup-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span><span>${telefono}</span></div>` : ''}
            <div class="sos-popup-row"><span class="sos-popup-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span>${mins} min activo</span></div>
          </div>
        </div>
      `)
      sosMarkersRef.current[s.id] = marker
    })
  }, [socketStats?.sos_activos])

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

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }, [])

  const locateMe = () => {
    const map = mapInstance.current
    if (!map) return
    if (userPos) map.setView([userPos.lat, userPos.lng], 15)
    else navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {}
    )
  }

  const openReportModal = () => {
    setShowReportModal(true)
    setReportType('accidente')
    setReportDesc('')
    setReportCoords(null)
    if (userPos) {
      setReportCoords({ lat: userPos.lat, lng: userPos.lng })
      placeReportPin(userPos.lat, userPos.lng)
    }
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    if (reportMarkerRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(reportMarkerRef.current)
      reportMarkerRef.current = null
    }
  }

  const placeReportPin = (lat, lng) => {
    if (!mapInstance.current) return
    if (reportMarkerRef.current) mapInstance.current.removeLayer(reportMarkerRef.current)
    reportMarkerRef.current = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `<div class="report-pin"><svg width="24" height="24" viewBox="0 0 24 24" fill="#ff1744"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 24],
      }),
    }).addTo(mapInstance.current)
  }

  const submitReport = async () => {
    if (!reportCoords) { showError('Selecciona una ubicación en el mapa'); return }
    setReportSubmitting(true)
    try {
      const payload = {
        tipo: reportType,
        descripcion: reportDesc,
        latitud: reportCoords.lat,
        longitud: reportCoords.lng,
        ubicacion_texto: `${reportCoords.lat.toFixed(4)}, ${reportCoords.lng.toFixed(4)}`,
      }
      await api.post('/api/v1/reportes', payload)
      showInfo('Reporte enviado correctamente ✅')
      closeReportModal()
      // refresh layers
      setTimeout(() => {
        setToggles(p => ({ ...p, reportes: false }))
        setTimeout(() => setToggles(p => ({ ...p, reportes: true })), 100)
      }, 500)
    } catch {
      showError('Error al enviar reporte')
    } finally { setReportSubmitting(false) }
  }

  const toggleLayer = k => setToggles(p => ({ ...p, [k]: !p[k] }))
  const getVal = (s, cfg) => {
    let v = s?.[cfg.key]
    if (v === undefined && cfg.altKey) v = s?.[cfg.altKey]
    return v ?? 0
  }

  // ── Map click → report pin ──
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const handler = async (e) => {
      if (!showReportModal) return
      const { lat, lng } = e.latlng
      setReportCoords({ lat, lng })
      placeReportPin(lat, lng)
    }
    map.on('click', handler)
    return () => map.off('click', handler)
  }, [mapInstance.current, showReportModal])

  const ss = stats || {}

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="mapa-wrap">
        <div className="dash-topbar">
          <div className="dash-top-left">
            {weather && (
              <div className="dash-weather">
                <span>{Sun} {weather.temp}°C</span>
                <span className="ws-sep">·</span>
                <span>{weather.condition}</span>
                <span className="ws-sep">·</span>
                <span>{Droplet} {weather.humidity}%</span>
                <span className="ws-sep">·</span>
                <span>{CloudRain} {weather.rain_prob}%</span>
              </div>
            )}
          </div>
          <div className="dash-top-right">
            <button className="dash-btn" onClick={() => mapInstance.current?.setView([6.2442, -75.5812], 12)} title="Centrar mapa">{Target}</button>
            <button className="dash-btn" onClick={locateMe} title="Mi ubicación">{MapPin}</button>
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
          <div className="mapa-bar-left"><h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{Map} Mapa</h2></div>
        </div>
        <div className="mapa-layers">
          {[{ k: 'zonas', l: 'Zonas' }, { k: 'reportes', l: 'Reportes' }, { k: 'transporte', l: 'Transporte' }].map(({ k, l }) => (
            <label key={k} className={`mapa-tag ${toggles[k] ? 'active' : ''}`} onClick={() => toggleLayer(k)}>{l}</label>
          ))}
          {trafficAvailable && (
            <label className={`mapa-tag ${trafficOn ? 'active' : ''}`} onClick={() => setTrafficOn(p => !p)}>
              {TrafficLight} Tráfico
            </label>
          )}
        </div>

        <div ref={mapRef} className="mapa-leaflet" />
        {mapLoading && <div className="mapa-loading"><div className="spinner" /></div>}

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
                <span className={`ticker-${t.dir}`}>{t.dir === 'up' ? <span style={{display:'inline-flex'}}>{ArrowUp}</span> : <span style={{display:'inline-flex'}}>{ArrowDown}</span>}</span>
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
          {trafficOn && (
            <div className="mapa-legend-item traffic-legend">
              <span style={{ background: '#00c853' }} />Libre
              <span style={{ background: '#ffab00', marginLeft: 6 }} />Moderado
              <span style={{ background: '#ff1744', marginLeft: 6 }} />Congestionado
            </div>
          )}
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

          <button className="mapa-report-fab" onClick={openReportModal} title="Reportar incidente">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {showReportModal && (
          <div className="report-modal-overlay" onClick={closeReportModal}>
            <div className="report-modal" onClick={e => e.stopPropagation()}>
              <div className="report-modal-header">
                <span>Reportar incidente</span>
                <button className="report-modal-close" onClick={closeReportModal}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="report-modal-body">
                <label className="report-label">Tipo de incidente</label>
                <div className="report-types">
                  {REPORT_TYPES.map(t => (
                    <div key={t.key} className={`report-type-btn ${reportType === t.key ? 'active' : ''}`}
                      style={reportType === t.key ? { borderColor: t.color, color: t.color } : {}}
                      onClick={() => setReportType(t.key)}>
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>

                <label className="report-label">Ubicación</label>
                <div className="report-location">
                  {reportCoords ? (
                    <span className="report-coords">{reportCoords.lat.toFixed(5)}, {reportCoords.lng.toFixed(5)}</span>
                  ) : (
                    <span className="report-coords report-coords-muted">Haz clic en el mapa para marcar la ubicación</span>
                  )}
                  {userPos && (
                    <button className="report-gps-btn" onClick={() => {
                      setReportCoords({ lat: userPos.lat, lng: userPos.lng })
                      placeReportPin(userPos.lat, userPos.lng)
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" />
                      </svg>
                      Usar mi ubicación
                    </button>
                  )}
                </div>

                <label className="report-label">Descripción (opcional)</label>
                <textarea className="report-desc" placeholder="Describe lo que ocurrió..." value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)} rows={3} />
              </div>

              <div className="report-modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={closeReportModal}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={submitReport} disabled={reportSubmitting || !reportCoords}>
                  {reportSubmitting ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
