import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import Loading from '../components/common/Loading'
import './Mapa.css'

const NIVEL_COLORS = { CRITICO: '#d32f2f', ALTO: '#ff6f00', MEDIO: '#fbc02d', BAJO: '#388e3c' }

function createIcon(emoji, bg = '#0054a6') {
  return L.divIcon({
    html: `<div style="background:${bg};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function Mapa() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({})
  const [loading, setLoading] = useState(true)
  const [toggles, setToggles] = useState({ zonas: true, reportes: true, transporte: true, favoritos: true, alertas: true, calor: false })
  const [userLoc, setUserLoc] = useState(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, { center: [6.2442, -75.5812], zoom: 12, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
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
      api.get('/api/v1/favoritos'),
      api.get('/api/v1/alertas?no_leidas=true'),
      api.get('/api/v1/eventos/near?lat=6.2442&lng=-75.5812&radio_km=20'),
    ]).then(([zonasRes, reportesRes, lineasRes, favoritosRes, alertasRes, eventosRes]) => {
      if (!mapInstance.current) return
      Object.values(layersRef.current).forEach(l => l.forEach(ll => map.removeLayer(ll)))
      layersRef.current = { zonas: [], reportes: [], transporte: [], favoritos: [], alertas: [], calor: [] }

      const zonas = zonasRes.data || []
      const reportes = reportesRes.data || []
      const lineas = lineasRes.data || []
      const favoritos = favoritosRes.data || []
      const alertas = alertasRes.data || []
      const eventos = eventosRes.data?.eventos || []

      zonas.forEach(z => {
        const color = NIVEL_COLORS[z.nivel] || '#999'
        const circle = L.circle([z.latitud, z.longitud], {
          radius: z.radio_metros || 500,
          color, fillColor: color, fillOpacity: 0.15, weight: 2,
        }).bindPopup(`<b>${z.nombre}</b><br>${z.nivel} - ${z.tipo_riesgo}<br>${z.comuna}`)
        layersRef.current.zonas.push(circle)
        if (toggles.zonas) circle.addTo(map)
      })

      reportes.forEach(r => {
        const m = L.marker([r.latitud, r.longitud], {
          icon: createIcon(['accidente', 'bloqueo'].includes(r.tipo) ? '🚗' : r.tipo === 'robo' ? '🔒' : '⚠️', '#0288d1'),
        }).bindPopup(`<b>${r.tipo}</b><br>${r.descripcion}<br>👍 ${r.votos_positivos} 👎 ${r.votos_negativos}`)
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
            const polyline = L.polyline(coords, { color: l.color || '#0054a6', weight: 3, opacity: 0.7 })
            layersRef.current.transporte.push(polyline)
            if (toggles.transporte) polyline.addTo(map)
            paradas.forEach(p => {
              const m = L.circleMarker([p.latitud, p.longitud], { radius: 4, color: '#fff', fillColor: l.color || '#0054a6', fillOpacity: 1, weight: 2 })
                .bindPopup(`<b>${p.nombre}</b><br>${l.nombre}`)
              layersRef.current.transporte.push(m)
              if (toggles.transporte) m.addTo(map)
            })
          } catch {}
        }
      }
      loadLineas()

      favoritos.forEach(f => {
        const m = L.marker([f.latitud, f.longitud], { icon: createIcon('⭐', '#fbc02d') })
          .bindPopup(`<b>${f.nombre}</b><br>${f.direccion || ''}`)
        layersRef.current.favoritos.push(m)
        if (toggles.favoritos) m.addTo(map)
      })

      alertas.forEach(a => {
        if (!a.zona_riesgo) return
        const color = NIVEL_COLORS[a.zona_riesgo.nivel] || '#999'
        const m = L.circleMarker([a.zona_riesgo.latitud, a.zona_riesgo.longitud], {
          radius: 10, color, fillColor: color, fillOpacity: 0.5, weight: 2,
        }).bindPopup(`<b>🔔 Alerta</b><br>${a.mensaje}`)
        layersRef.current.alertas.push(m)
        if (toggles.alertas) m.addTo(map)
      })

      setEvents(eventos)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [toggles])

  const toggleLayer = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const locateMe = () => {
    if (!mapInstance.current) return
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          setUserLoc({ lat: latitude, lng: longitude })
          mapInstance.current.setView([latitude, longitude], 15)
          L.marker([latitude, longitude], { icon: createIcon('📍', '#3cac4e') })
            .addTo(mapInstance.current)
            .bindPopup('<b>Tu ubicación</b>').openPopup()
        },
        () => alert('No se pudo obtener tu ubicación')
      )
    } else {
      alert('Geolocalización no soportada')
    }
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="mapa-container">
        <div className="mapa-toolbar">
          <div className="mapa-toolbar-left">
            <h2 className="page-title" style={{ fontSize: '1.2rem' }}>🗺️ Mapa Interactivo</h2>
          </div>
          <div className="mapa-toolbar-right">
            <button className="btn btn-ghost btn-sm" onClick={locateMe}>📍 Mi ubicación</button>
            <button className="btn btn-ghost btn-sm" onClick={() => mapInstance.current?.setView([6.2442, -75.5812], 12)}>🎯 Centrar</button>
          </div>
        </div>

        <div className="mapa-layers">
          {Object.entries({ zonas: 'Zonas', reportes: 'Reportes', transporte: 'Transporte', favoritos: 'Favoritos', alertas: 'Alertas', calor: 'Calor' }).map(([key, label]) => (
            <label key={key} className="mapa-layer-item" onClick={() => toggleLayer(key)}>
              <input type="checkbox" checked={toggles[key]} onChange={() => {}} />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div ref={mapRef} className="mapa-leaflet" />
        {loading && <div className="mapa-loading"><div className="spinner" /></div>}

        <div className="mapa-legend">
          {Object.entries(NIVEL_COLORS).map(([nivel, color]) => (
            <div key={nivel} className="mapa-legend-item">
              <span style={{ background: color }} />
              {nivel}
            </div>
          ))}
        </div>

        {events.length > 0 && (
          <div className="mapa-events">
            <div className="mapa-events-title">Eventos cercanos ({events.length})</div>
            {events.slice(0, 3).map(e => (
              <div key={e.id} className="mapa-event-item">
                <span className={`badge badge-${e.nivel?.toLowerCase()}`}>{e.nivel}</span>
                {e.titulo}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
