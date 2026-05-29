import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import AnimatedNumber from '../components/common/AnimatedNumber'
import Loading from '../components/common/Loading'
import './Dashboard.css'

const COLORS = {
  CRITICO: { color: 'var(--red)', bg: 'var(--red-bg)' },
  ALTO: { color: 'var(--amber)', bg: 'var(--amber-bg)' },
  MEDIO: { color: 'var(--blue)', bg: 'var(--blue-bg)' },
  BAJO: { color: 'var(--green)', bg: 'var(--green-bg)' },
}

function TickerCard({ icon, label, value, color }) {
  return (
    <div className="ticker-card" style={{ borderTop: `2px solid ${color}` }}>
      <div className="ticker-label">{label}</div>
      <div className="ticker-value">
        <AnimatedNumber value={value ?? 0} />
      </div>
      <div className="ticker-icon">{icon}</div>
    </div>
  )
}

function MiniChartBars({ data, labels, colors }) {
  if (!data?.length) return null
  const max = Math.max(...data, 1)
  return (
    <div className="mc-bars">
      {data.map((v, i) => (
        <div key={i} className="mc-col" title={`${labels[i]}: ${v}`}>
          <div className="mc-bar" style={{
            height: `${(v / max) * 100}%`,
            background: colors?.[i] || 'var(--blue)',
            transition: 'height 0.5s ease',
          }} />
          <div className="mc-label">{labels[i]?.slice(0, 4)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)
  const [ticker, setTicker] = useState([])
  const socketStats = useSocket().stats
  const { error: showError } = useToast()
  const tickerRef = useRef([])

  const load = useCallback(async () => {
    try {
      const [statsRes, weatherRes] = await Promise.all([
        api.get('/api/v1/stats'),
        api.get('/api/v1/weather').catch(() => null),
      ])
      setStats(statsRes.data)
      setWeather(weatherRes?.data)
    } catch {
      showError('Error al cargar datos')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!socketStats) return
    setStats(prev => {
      if (!prev) return socketStats
      const changed = []
      Object.entries(socketStats).forEach(([k, v]) => {
        if (prev[k] !== undefined && prev[k] !== v) {
          changed.push(`${k}: ${prev[k]} → ${v}`)
        }
      })
      if (changed.length) {
        setTicker(t => [{ time: new Date().toLocaleTimeString(), msg: changed.join(', ') }, ...t].slice(0, 20))
      }
      return { ...prev, ...socketStats }
    })
  }, [socketStats])

  if (loading) return <Loading />

  const s = stats || {}

  const cards = [
    { icon: '⚠', label: 'ZONAS RIESGO', value: s.zonas_riesgo, color: '#ffab00' },
    { icon: '📋', label: 'REPORTES ACTIVOS', value: s.reportes_activos, color: '#2979ff' },
    { icon: '🚇', label: 'LINEAS TRANSPORTE', value: s.lineas_transporte, color: '#00c853' },
    { icon: '🔔', label: 'ALERTAS NO LEIDAS', value: s.alertas_no_leidas ?? s.alertas_enviadas, color: '#ff1744' },
    { icon: '🆘', label: 'EVENTOS SOS', value: s.eventos_sos, color: '#d500f9' },
    { icon: '⭐', label: 'FAVORITOS', value: s.favoritos, color: '#ffab00' },
    { icon: '📍', label: 'PARADAS', value: s.paradas, color: '#00bcd4' },
    { icon: '📊', label: 'TOTAL REPORTES', value: s.total_reportes, color: '#2979ff' },
  ]

  const niveles = s.zonas_por_nivel || {}
  const nivelData = Object.values(niveles)
  const nivelLabels = Object.keys(niveles)
  const nivelColors = nivelLabels.map(n => COLORS[n]?.color || '#666')

  const tipos = s.reportes_por_tipo || {}
  const tipoData = Object.values(tipos)
  const tipoLabels = Object.keys(tipos)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Monitoreo en vivo · Movilidad Medellín</p>
      </div>

      {weather && (
        <div className="weather-strip">
          <div className="ws-item"><span className="ws-dot" style={{ background: '#ffab00' }} />{weather.temp}°C</div>
          <div className="ws-item"><span className="ws-dot" style={{ background: '#2979ff' }} />{weather.condition}</div>
          <div className="ws-item"><span className="ws-dot" style={{ background: '#00c853' }} />{weather.humidity}% HR</div>
          <div className="ws-item"><span className="ws-dot" style={{ background: '#ff1744' }} />Lluvia {weather.rain_prob}%</div>
        </div>
      )}

      <div className="ticker-grid">
        {cards.map(c => <TickerCard key={c.label} {...c} />)}
      </div>

      <div className="dash-row">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Zonas por Nivel</div>
            <span className="badge badge-info">LIVE</span>
          </div>
          <div className="card-body">
            <MiniChartBars data={nivelData} labels={nivelLabels} colors={nivelColors} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Reportes por Tipo</div>
            <span className="badge badge-info">LIVE</span>
          </div>
          <div className="card-body">
            <MiniChartBars data={tipoData} labels={tipoLabels} />
          </div>
        </div>

        <div className="card dash-ticker-card">
          <div className="card-header">
            <div className="card-title">Live Ticker</div>
            <span className="badge badge-info">5s</span>
          </div>
          <div className="card-body" style={{ maxHeight: 200, overflow: 'auto' }}>
            {ticker.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-state-text" style={{ fontSize: '0.75rem' }}>Esperando cambios en vivo...</div>
              </div>
            ) : (
              ticker.map((t, i) => (
                <div key={i} className="ticker-line">
                  <span className="ticker-time">{t.time}</span>
                  <span className="ticker-msg">{t.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
