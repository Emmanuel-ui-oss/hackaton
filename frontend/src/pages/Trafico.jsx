import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import './Trafico.css'

const GOOGLE_TILES = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'

const NIVEL = {
  critico: { label: 'CRÍTICO', color: '#ff1744', bg: 'rgba(255,23,68,0.15)', fill: 'rgba(255,23,68,0.35)', order: 0 },
  alto: { label: 'ALTO', color: '#ffab00', bg: 'rgba(255,171,0,0.15)', fill: 'rgba(255,171,0,0.3)', order: 1 },
  medio: { label: 'MEDIO', color: '#2979ff', bg: 'rgba(41,121,255,0.15)', fill: 'rgba(41,121,255,0.25)', order: 2 },
  bajo: { label: 'BAJO', color: '#00c853', bg: 'rgba(0,200,83,0.12)', fill: 'rgba(0,200,83,0.2)', order: 3 },
}

export default function Trafico() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const circlesLayer = useRef(null)
  const [comunas, setComunas] = useState([])
  const [overall, setOverall] = useState('bajo')
  const [hora, setHora] = useState('')
  const [dia, setDia] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // ── Map init ──
  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, {
      center: [6.2442, -75.5812],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    })
    L.tileLayer(GOOGLE_TILES, { maxZoom: 20 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    circlesLayer.current = L.layerGroup().addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 200)
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  // ── Fetch data ──
  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/trafico/mapa')
      const data = res.data
      setComunas(data.comunas || [])
      setOverall(data.overall || 'bajo')
      setHora(data.hora)
      setDia(data.dia)
      setLastUpdate(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  // ── Draw circles ──
  useEffect(() => {
    const map = mapInstance.current
    const layer = circlesLayer.current
    if (!map || !layer) return
    layer.clearLayers()
    comunas.forEach(c => {
      const cfg = NIVEL[c.nivel] || NIVEL.bajo
      const circle = L.circle([c.latitud, c.longitud], {
        radius: c.radio_metros,
        color: cfg.color,
        fillColor: cfg.fill,
        fillOpacity: 0.4,
        weight: 2,
        opacity: 0.6,
      })
      circle.bindPopup(`
        <div style="color:#e0e0e0;font-size:12px">
          <b style="color:#fff">${c.nombre}</b><br>
          <span style="color:${cfg.color};font-weight:700">${cfg.label}</span>
          <span style="color:#888"> · ${c.comuna}</span><br>
          <span style="color:#9aa0a6">${c.probabilidad}% congestión</span>
        </div>
      `)
      layer.addLayer(circle)
    })
  }, [comunas])

  const sorted = [...comunas].sort((a, b) => {
    const oa = (NIVEL[a.nivel] || NIVEL.bajo).order
    const ob = (NIVEL[b.nivel] || NIVEL.bajo).order
    if (oa !== ob) return oa - ob
    return b.probabilidad - a.probabilidad
  })

  const maxProb = Math.max(...comunas.map(c => c.probabilidad), 1)

  return (
    <div className="page trafico-page">
      {/* ── MAP ── */}
      <div ref={mapRef} className="trafico-map" />

      {/* ── SIDE PANEL ── */}
      <div className="trafico-panel">
        <div className="trafico-header">
          <h1 className="trafico-title">Tráfico</h1>
          <p className="trafico-subtitle">Nivel de congestión por comuna</p>
        </div>

        {loading ? (
          <div className="trafico-loading">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="trafico-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff1744" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Datos no disponibles
          </div>
        ) : (
          <>
            <div className="trafico-info">
              <span className={`trafico-badge trafico-badge--${overall}`}>
                {(NIVEL[overall] || NIVEL.bajo).label}
              </span>
              <span className="trafico-time">{dia}, {hora}:00</span>
            </div>

            <div className="trafico-legend">
              {Object.values(NIVEL).map(n => (
                <div key={n.label} className="trafico-legend-item">
                  <span style={{ background: n.color }} />
                  {n.label}
                </div>
              ))}
            </div>

            <div className="trafico-list">
              {sorted.map(c => {
                const cfg = NIVEL[c.nivel] || NIVEL.bajo
                const pct = maxProb > 0 ? (c.probabilidad / maxProb) * 100 : 0
                return (
                  <div key={c.comuna} className="trafico-row">
                    <div className="trafico-row-top">
                      <span className="trafico-row-name">{c.comuna.replace('Comuna ', 'C')}</span>
                      <span className={`trafico-row-nivel`} style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="trafico-row-pct" style={{ color: cfg.color }}>{c.probabilidad}%</span>
                    </div>
                    <div className="trafico-row-track">
                      <div className="trafico-row-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {lastUpdate && (
              <div className="trafico-footer">
                Actualizado {lastUpdate.toLocaleTimeString()} · cada 30s
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
