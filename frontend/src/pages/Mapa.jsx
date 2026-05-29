import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import Loading from '../components/common/Loading'
import './Mapa.css'

const NIVEL_STYLES = {
  CRITICO: { color: '#ff1744', fill: 'rgba(255,23,68,0.15)', border: 'rgba(255,23,68,0.3)' },
  ALTO: { color: '#ffab00', fill: 'rgba(255,171,0,0.12)', border: 'rgba(255,171,0,0.3)' },
  MEDIO: { color: '#2979ff', fill: 'rgba(41,121,255,0.12)', border: 'rgba(41,121,255,0.3)' },
  BAJO: { color: '#00c853', fill: 'rgba(0,200,83,0.12)', border: 'rgba(0,200,83,0.3)' },
}

function divIcon(html, size = 28) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);border:2px solid var(--border);font-size:${size*0.4}px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${html}</div>`,
    className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
  })
}

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>'

export default function Mapa() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({})
  const [loading, setLoading] = useState(true)
  const [toggles, setToggles] = useState({ zonas: true, reportes: true, transporte: true, calor: false })
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, { center: [6.2442, -75.5812], zoom: 12, zoomControl: false })
    L.tileLayer(DARK_TILE, { maxZoom: 19, attribution: DARK_ATTR }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 200)
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current
    setLoading(true)

    Promise.all([
      api.get('/api/v1/zonas-riesgo'),
      api.get('/api/v1/reportes'),
      api.get('/api/v1/lineas-transporte'),
      api.get('/api/v1/eventos/near?lat=6.2442&lng=-75.5812&radio_km=20'),
    ]).then(([zonasRes, reportesRes, lineasRes, eventosRes]) => {
      if (!mapInstance.current) return

      Object.values(layersRef.current).forEach(l => l.forEach(ll => map.removeLayer(ll)))
      layersRef.current = { zonas: [], reportes: [], transporte: [], calor: [] }

      const zonas = zonasRes.data || []
      const reportes = reportesRes.data || []
      const lineas = lineasRes.data || []
      const eventos = eventosRes.data?.eventos || []

      zonas.forEach(z => {
        const style = NIVEL_STYLES[z.nivel] || NIVEL_STYLES.MEDIO
        const circle = L.circle([z.latitud, z.longitud], {
          radius: z.radio_metros || 500,
          color: style.color,
          fillColor: style.border,
          fillOpacity: 0.3,
          weight: 1.5,
        })
        circle.bindPopup(`
          <div style="font-family:system-ui;color:#e0e0e0">
            <b style="color:#fff">${z.nombre}</b><br>
            <span style="color:${style.color}">${z.nivel}</span> · ${z.tipo_riesgo}<br>
            ${z.comuna}
          </div>
        `)
        layersRef.current.zonas.push(circle)
        if (toggles.zonas) circle.addTo(map)
      })

      reportes.forEach(r => {
        const m = L.marker([r.latitud, r.longitud], {
          icon: divIcon(r.tipo === 'accidente' ? '💥' : r.tipo === 'bloqueo' ? '🚧' : '⚠️', 24),
        })
        m.bindPopup(`<div style="color:#e0e0e0;font-size:12px"><b style="color:#fff">${r.tipo}</b><br>${r.descripcion?.slice(0,80)}</div>`)
        layersRef.current.reportes.push(m)
        if (toggles.reportes) m.addTo(map)
      })

      const loadLineas = async () => {
        for (const l of lineas) {
          try {
            const paradasRes = await api.get(`/api/v1/lineas-transporte/${l.id}/paradas`)
            const paradas = paradasRes.data || []
            if (paradas.length < 2) continue
            const coords = paradas.map(p => [p.latitud, p.longitud])
            const polyline = L.polyline(coords, { color: l.color || '#2979ff', weight: 2, opacity: 0.4 })
            layersRef.current.transporte.push(polyline)
            if (toggles.transporte) polyline.addTo(map)
            paradas.forEach(p => {
              const m = L.circleMarker([p.latitud, p.longitud], { radius: 3, color: '#fff', fillColor: l.color || '#2979ff', fillOpacity: 0.8, weight: 1 })
              layersRef.current.transporte.push(m)
              if (toggles.transporte) m.addTo(map)
            })
          } catch {}
        }
      }
      loadLineas()

      setEvents(eventos)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [toggles])

  const toggleLayer = (key) => setToggles(p => ({ ...p, [key]: !p[key] }))

  const locateMe = () => {
    if (!mapInstance.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        mapInstance.current.setView([latitude, longitude], 15)
        L.marker([latitude, longitude], { icon: divIcon('📍', 32) })
          .addTo(mapInstance.current).bindPopup('<b>Tu ubicación</b>').openPopup()
      },
      () => alert('No se pudo obtener ubicación')
    )
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="mapa-wrap">
        <div className="mapa-bar">
          <div className="mapa-bar-left">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>🗺️ Map</h2>
          </div>
          <div className="mapa-bar-right">
            <button className="btn btn-ghost btn-sm" onClick={locateMe}>📍</button>
            <button className="btn btn-ghost btn-sm" onClick={() => mapInstance.current?.setView([6.2442, -75.5812], 12)}>🎯</button>
          </div>
        </div>
        <div className="mapa-layers">
          {[{k:'zonas',l:'Zonas'},{k:'reportes',l:'Reportes'},{k:'transporte',l:'Transporte'},{k:'calor',l:'Calor'}].map(({k,l}) => (
            <label key={k} className={`mapa-tag ${toggles[k] ? 'active' : ''}`} onClick={() => toggleLayer(k)}>
              {l}
            </label>
          ))}
        </div>
        <div ref={mapRef} className="mapa-leaflet" />
        {loading && <div className="mapa-loading"><div className="spinner" /></div>}
        <div className="mapa-legend">
          {Object.entries(NIVEL_STYLES).map(([n, s]) => (
            <div key={n} className="mapa-legend-item">
              <span style={{ background: s.color }} />{n}
            </div>
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
