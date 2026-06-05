import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { Sun, Droplet } from '../../icons'
import './LandingLiveBars.css'

const NIVEL_CONFIG = {
  critico: { label: 'CRÍTICO', color: '#ff1744', bg: 'rgba(255,23,68,0.15)' },
  alto:    { label: 'ALTO',    color: '#ffab00', bg: 'rgba(255,171,0,0.15)' },
  medio:   { label: 'MEDIO',   color: '#2979ff', bg: 'rgba(41,121,255,0.15)' },
  bajo:    { label: 'BAJO',    color: '#00c853', bg: 'rgba(0,200,83,0.15)' },
}

const LEVEL_ORDER = { critico: 0, alto: 1, medio: 2, bajo: 3 }

export default function LandingLiveBars() {
  const [comunas, setComunas] = useState([])
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/public/landing')
      const data = res.data
      setComunas(data.comunas || [])
      setWeather(data.weather || null)
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
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return (
      <section className="live-bars-section">
        <div className="live-bars-container">
          <div className="live-bars-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-bar" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="live-bars-section">
        <div className="live-bars-container">
          <div className="live-bars-header">
            <h2>Estado del tráfico en tiempo real</h2>
            <p className="live-bars-error">Datos no disponibles</p>
          </div>
        </div>
      </section>
    )
  }

  const sorted = [...comunas].sort((a, b) => {
    const la = LEVEL_ORDER[a.nivel] ?? 9
    const lb = LEVEL_ORDER[b.nivel] ?? 9
    if (la !== lb) return la - lb
    return b.probabilidad - a.probabilidad
  })

  const maxProb = Math.max(...comunas.map(c => c.probabilidad), 1)

  return (
    <section className="live-bars-section">
      <div className="live-bars-container">
        <div className="live-bars-header">
          <h2>Estado del tráfico en tiempo real</h2>
          <p>Nivel de congestión por comuna — datos basados en eventos e incidentes activos</p>
        </div>

        {weather && (
          <div className="live-weather">
            <span className="live-weather-icon"><span style={{display:'inline-flex'}}>{Sun}</span></span>
            <span className="live-weather-temp">{weather.temp}°C</span>
            <span className="live-weather-sep">·</span>
            <span className="live-weather-cond">{weather.condition}</span>
            <span className="live-weather-sep">·</span>
            <span className="live-weather-hum"><span style={{display:'inline-flex'}}>{Droplet}</span> {weather.humidity}%</span>
          </div>
        )}

        <div className="live-bars-grid">
          {sorted.map((c, i) => {
            const cfg = NIVEL_CONFIG[c.nivel] || NIVEL_CONFIG.bajo
            const pct = (c.probabilidad / maxProb) * 100
            return (
              <div key={c.comuna} className="live-bar-row">
                <span className="live-bar-name">{c.comuna.replace('Comuna ', 'C')}</span>
                <div className="live-bar-track">
                  <div
                    className="live-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: cfg.color,
                    }}
                  />
                </div>
                <span className="live-bar-pct" style={{ color: cfg.color }}>{c.probabilidad}%</span>
                <span className="live-bar-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color }}>{cfg.label}</span>
              </div>
            )
          })}
        </div>

        {lastUpdate && (
          <div className="live-bars-footer">
            Última actualización: {lastUpdate.toLocaleTimeString()} · Auto-refresh cada 15s
          </div>
        )}
      </div>
    </section>
  )
}
