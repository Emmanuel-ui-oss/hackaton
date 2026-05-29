import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useTheme } from '../contexts/ThemeContext'
import Loading from '../components/common/Loading'
import './Dashboard.css'

const COLORS = {
  CRITICO: '#d32f2f', ALTO: '#ff6f00', MEDIO: '#fbc02d', BAJO: '#388e3c',
  accidente: '#d32f2f', bloqueo: '#ff6f00', zona_peligrosa: '#f59e0b',
  robo: '#7c3aed', clima: '#0288d1', otro: '#9e9e9e',
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}20`, color }}>{icon}</div>
      <div>
        <div className="stat-value">{value ?? '-'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function MiniChart({ data, labels, color, title }) {
  if (!data?.length) return null
  const max = Math.max(...data, 1)
  return (
    <div className="mini-chart">
      <div className="mini-chart-title">{title}</div>
      <div className="mini-chart-bars">
        {data.map((v, i) => (
          <div key={i} className="mini-chart-col" title={`${labels[i]}: ${v}`}>
            <div className="mini-chart-bar" style={{ height: `${(v / max) * 100}%`, background: color }} />
            <div className="mini-chart-label">{labels[i]?.slice(0, 3)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)
  const [recent, setRecent] = useState([])
  const socketStats = useSocket().stats
  const { theme } = useTheme()

  const load = useCallback(async () => {
    try {
      const [statsRes, weatherRes, reportesRes] = await Promise.all([
        api.get('/api/v1/stats'),
        api.get('/api/v1/weather').catch(() => null),
        api.get('/api/v1/reportes'),
      ])
      setStats(statsRes.data)
      setWeather(weatherRes?.data)
      setRecent(reportesRes.data?.slice(0, 5) || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (socketStats) setStats(prev => prev ? { ...prev, ...socketStats } : prev)
  }, [socketStats])

  if (loading) return <Loading />

  const s = stats || {}

  const statsCards = [
    { icon: '⚠️', label: 'Zonas de Riesgo', value: s.zonas_riesgo, color: '#ff6f00' },
    { icon: '📋', label: 'Reportes Activos', value: s.reportes_activos, color: '#0288d1' },
    { icon: '🚇', label: 'Líneas Transporte', value: s.lineas_transporte, color: '#3cac4e' },
    { icon: '📍', label: 'Paradas', value: s.paradas, color: '#7c3aed' },
    { icon: '🔔', label: 'Alertas Enviadas', value: s.alertas_enviadas, color: '#d32f2f' },
    { icon: '🆘', label: 'Eventos SOS', value: s.eventos_sos, color: '#e91e63' },
    { icon: '⭐', label: 'Favoritos', value: s.favoritos, color: '#fbc02d' },
    { icon: '📊', label: 'Total Reportes', value: s.total_reportes, color: '#1a73e8' },
  ]

  const niveles = s.zonas_por_nivel || {}
  const nivelData = Object.values(niveles)
  const nivelLabels = Object.keys(niveles)
  const nivelColors = nivelLabels.map(n => COLORS[n] || '#999')

  const tipos = s.reportes_por_tipo || {}
  const tipoData = Object.values(tipos)
  const tipoLabels = Object.keys(tipos)
  const tipoColors = tipoLabels.map(t => COLORS[t] || '#999')

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Panorama general de movilidad en Medellín</p>
      </div>

      {weather && (
        <div className="weather-bar">
          <span>🌤️ {weather.temp}°C - {weather.condition}</span>
          <span>💧 {weather.humidity}%</span>
          <span>🌧️ {weather.rain_prob}%</span>
        </div>
      )}

      <div className="stats-grid">
        {statsCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Zonas por Nivel de Riesgo</div>
            <span className="badge badge-info">En tiempo real</span>
          </div>
          <MiniChart data={nivelData} labels={nivelLabels} color={nivelColors[0] || '#ff6f00'} title="" />
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Reportes por Tipo</div>
            <span className="badge badge-info">En tiempo real</span>
          </div>
          <MiniChart data={tipoData} labels={tipoLabels} color={tipoColors[0] || '#0288d1'} title="" />
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Últimos Reportes</div>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No hay reportes recientes</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td><span className={`badge badge-${r.tipo}`}>{r.tipo}</span></td>
                    <td>{r.usuario_username || r.usuario}</td>
                    <td>{new Date(r.creado).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
