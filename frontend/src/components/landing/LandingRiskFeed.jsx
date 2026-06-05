import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import './LandingRiskFeed.css'

const NIVEL_COLORS = {
  critico: { dot: '#ff1744', badge: 'rgba(255,23,68,0.15)', text: '#ff1744' },
  alto:    { dot: '#ffab00', badge: 'rgba(255,171,0,0.15)',  text: '#ffab00' },
  medio:   { dot: '#2979ff', badge: 'rgba(41,121,255,0.15)', text: '#2979ff' },
  bajo:    { dot: '#00c853', badge: 'rgba(0,200,83,0.15)',   text: '#00c853' },
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Hace ${diffHr} h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `Hace ${diffDay}d`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const TIPO_LABEL = {
  accidente_vial: 'Accidente vial',
  inundacion: 'Inundación',
  deslizamiento: 'Deslizamiento',
  incendio: 'Incendio',
  robo: 'Robo',
  manifestacion: 'Manifestación',
  derrumbe: 'Derrumbe',
}

export default function LandingRiskFeed() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/public/landing')
      const data = res.data
      setEventos(data.eventos || [])
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

  return (
    <section className="risk-feed-section">
      <div className="risk-feed-container">
        <div className="risk-feed-header">
          <h2>Riesgos en tiempo real</h2>
          <p>Últimos eventos de riesgo registrados en Medellín</p>
        </div>

        {loading && (
          <div className="risk-feed-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-event" />
            ))}
          </div>
        )}

        {error && (
          <div className="risk-feed-empty">
            No se pudieron cargar los eventos de riesgo
          </div>
        )}

        {!loading && !error && eventos.length === 0 && (
          <div className="risk-feed-empty">
            No hay eventos de riesgo registrados en los últimos meses
          </div>
        )}

        {!loading && !error && eventos.length > 0 && (
          <div className="risk-feed-list">
            {(showAll ? eventos : eventos.slice(0, 5)).map((e) => {
              const colors = NIVEL_COLORS[e.nivel] || NIVEL_COLORS.bajo
              const tipoLabel = TIPO_LABEL[e.tipo] || e.tipo
              return (
                <div key={e.id} className="risk-feed-card">
                  <div className="risk-feed-dot" style={{ background: colors.dot }} />
                  <div className="risk-feed-content">
                    <div className="risk-feed-top">
                      <span className="risk-feed-tipo">{tipoLabel}</span>
                      <span className="risk-feed-badge" style={{ background: colors.badge, color: colors.text }}>
                        {e.nivel.toUpperCase()}
                      </span>
                      {e.fuente && <span className="risk-feed-fuente">{e.fuente}</span>}
                    </div>
                    <p className="risk-feed-titulo">{e.titulo}</p>
                    {e.descripcion && <p className="risk-feed-desc">{e.descripcion}</p>}
                    <span className="risk-feed-time">{formatDate(e.creado)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && !error && eventos.length > 5 && !showAll && (
          <button className="risk-feed-more" onClick={() => setShowAll(true)}>
            Ver más ({eventos.length - 5} restantes)
          </button>
        )}
      </div>
    </section>
  )
}
