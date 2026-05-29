import { useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import Loading from '../components/common/Loading'
import './PlanificarRuta.css'

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const OSRM_BASE = 'https://router.project-osrm.org'

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
  const routeLayer = useRef(null)
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [routeInfo, setRouteInfo] = useState(null)

  const initMap = () => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, { center: [6.2442, -75.5812], zoom: 12, zoomControl: false })
    L.tileLayer(DARK_TILE, { maxZoom: 19, attribution: '&copy; CARTO' }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 200)
  }

  const geocode = async (q) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)},Medellín&format=json&limit=1`)
    const data = await res.json()
    if (!data.length) throw new Error('No encontrado')
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }

  const buscarRuta = async () => {
    if (!origin || !dest) return
    setLoading(true)
    setRouteInfo(null)
    try {
      const [origC, destC] = await Promise.all([geocode(origin), geocode(dest)])
      initMap()
      const map = mapInstance.current

      const res = await fetch(`${OSRM_BASE}/route/v1/driving/${origC.lng},${origC.lat};${destC.lng},${destC.lat}?overview=full&geometries=geojson&steps=true&alternatives=2`)
      const data = await res.json()
      if (!data.routes?.length) throw new Error('Ruta no encontrada')

      if (routeLayer.current) map.removeLayer(routeLayer.current)
      routeLayer.current = L.layerGroup().addTo(map)

      const zonasRes = await api.get('/api/v1/zonas-riesgo').catch(() => ({ data: [] }))
      const zonas = zonasRes.data || []

      data.routes.forEach((route, idx) => {
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]])
        const segments = splitIntoSegments(coords, 15)
        const color = idx === 0 ? '#2979ff' : '#666'

        const lines = segments.map(seg => {
          const avgRisk = avgRiskForCoords(seg, zonas)
          const segColor = getRiskColor(avgRisk)
          return L.polyline(seg, {
            color: idx === 0 ? segColor : '#444',
            weight: idx === 0 ? 5 : 3,
            opacity: idx === 0 ? 0.8 : 0.3,
            dashArray: idx === 0 ? null : '4 6',
          })
        })

        lines.forEach(l => routeLayer.current.addLayer(l))

        if (idx === 0) {
          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })

          const totalRisk = route.legs?.reduce((s, l) => s + (l.steps?.length || 0), 0) || 0
          const dist = route.distance
          const dur = route.duration
          const worst = Math.max(...segments.map(s => avgRiskForCoords(s, zonas)))
          const riskLevel = worst >= 0.7 ? 'Alto' : worst >= 0.4 ? 'Medio' : worst >= 0.2 ? 'Bajo' : 'Mínimo'
          const riskColor = getRiskColor(worst)

          setRouteInfo({
            distance: (dist / 1000).toFixed(1),
            duration: Math.round(dur / 60),
            riskLevel,
            riskColor,
            alternatives: data.routes.length - 1,
          })
        }
      })

      L.marker([origC.lat, origC.lng], { icon: L.divIcon({ html: '<div class="ruta-marker ruta-marker-o">A</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(routeLayer.current)
      L.marker([destC.lat, destC.lng], { icon: L.divIcon({ html: '<div class="ruta-marker ruta-marker-d">B</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(routeLayer.current)

    } catch (err) {
      alert(err.message || 'Error al buscar ruta')
    } finally { setLoading(false) }
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="ruta-wrap">
        <div className="ruta-bar">
          <div className="ruta-inputs">
            <input className="ruta-input" placeholder="Origen en Medellín" value={origin}
              onChange={e => setOrigin(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarRuta()} />
            <input className="ruta-input" placeholder="Destino en Medellín" value={dest}
              onChange={e => setDest(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarRuta()} />
            <button className="btn btn-primary btn-sm" onClick={buscarRuta} disabled={loading}>
              {loading ? '...' : '›'}
            </button>
          </div>
        </div>

        <div ref={mapRef} className="ruta-map" />

        {routeInfo && (
          <div className="ruta-info">
            <div className="ri-row">
              <div className="ri-label">Distancia</div>
              <div className="ri-value">{routeInfo.distance} km</div>
            </div>
            <div className="ri-row">
              <div className="ri-label">Duración</div>
              <div className="ri-value">{routeInfo.duration} min</div>
            </div>
            <div className="ri-row">
              <div className="ri-label">Riesgo</div>
              <div className="ri-value" style={{ color: routeInfo.riskColor }}>{routeInfo.riskLevel}</div>
            </div>
            <div className="ri-row">
              <div className="ri-label">Alternativas</div>
              <div className="ri-value">{routeInfo.alternatives}</div>
            </div>
            <div className="ri-legend">
              {Object.entries(RISK_COLORS).map(([k, v]) => (
                <div key={k} className="ri-legend-item">
                  <span style={{ background: v }} />{k}
                </div>
              ))}
            </div>
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
