import { useState, useEffect, useCallback } from 'react'
import { AlertCircle } from '../../icons'
import './LiveZoneChart.css'

const API_URL = '/api/public/zonas-riesgo'

const RISK_ORDER = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 }
const RISK_WIDTH = { CRITICO: 100, ALTO: 70, MEDIO: 40, BAJO: 15 }
const RISK_COLORS = {
  CRITICO: '#ff1744',
  ALTO: '#ffab00',
  MEDIO: '#2979ff',
  BAJO: '#00c853',
}
const TIPO_LABELS = {
  VIOLENCIA: 'Violencia',
  ROBO: 'Robo',
  ACCIDENTE: 'Accidente',
  INUNDACION: 'Inundación',
  DESLIZAMIENTO: 'Deslizamiento',
  OTRO: 'Otro',
}

export default function LiveZoneChart() {
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchZonas = useCallback(async () => {
    try {
      const res = await fetch(API_URL)
      const data = await res.json()
      if (data?.zonas) {
        setZonas(data.zonas)
        setLastUpdate(Date.now())
      }
    } catch {
      // Silently fail — keep previous data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchZonas()
    const interval = setInterval(fetchZonas, 5000)
    return () => clearInterval(interval)
  }, [fetchZonas])

  const sorted = [...zonas].sort((a, b) => {
    const order = (RISK_ORDER[a.nivel] ?? 99) - (RISK_ORDER[b.nivel] ?? 99)
    if (order !== 0) return order
    return (a.comuna || '').localeCompare(b.comuna || '')
  })

  const timeAgo = lastUpdate
    ? Math.floor((Date.now() - lastUpdate) / 1000)
    : null

  if (loading) {
    return (
      <section className="live-zone-chart reveal">
        <div className="landing-section-header">
          <h2>Cargando zonas de riesgo...</h2>
        </div>
      </section>
    )
  }

  return (
    <section className="live-zone-chart reveal">
      <div className="landing-section-header">
        <h2><span style={{display:'inline-flex', verticalAlign:'middle'}}>{AlertCircle}</span> Riesgo por Comunas</h2>
        <p>
          Nivel de peligrosidad en las comunas de Medellín
          <span className="live-badge">
            <span className="live-dot" />
            EN VIVO
          </span>
          {timeAgo !== null && (
            <span className="live-ts">· Actualizado hace {timeAgo}s</span>
          )}
        </p>
      </div>

      <div className="zone-list">
        {sorted.length === 0 && (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <div className="empty-state-text">No hay datos disponibles</div>
          </div>
        )}
        {sorted.map((z, i) => {
          const color = RISK_COLORS[z.nivel] || RISK_COLORS.BAJO
          const width = RISK_WIDTH[z.nivel] || RISK_WIDTH.BAJO
          const tipoLabel = TIPO_LABELS[z.tipo_riesgo] || z.tipo_riesgo

          return (
            <div key={z.id || i} className="zone-row" style={{ '--bar-color': color }}>
              <div className="zone-info">
                <span className="zone-name">{z.comuna || z.nombre}</span>
                <span className="zone-tipo">{tipoLabel}</span>
              </div>
              <div className="zone-bar-track">
                <div className="zone-bar-fill" style={{ width: `${width}%` }}>
                  <div className="zone-bar-shimmer" />
                </div>
              </div>
              <div className="zone-meta">
                <span className="zone-level" style={{ color }}>{z.nivel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
