import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import AnimatedNumber from '../components/common/AnimatedNumber'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  PointElement, LineElement, Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler)
import './Dashboard.css'

const NIVEL_STYLES = {
  CRITICO: { color: '#ff1744' },
  ALTO:    { color: '#ffab00' },
  MEDIO:   { color: '#2979ff' },
  BAJO:    { color: '#00c853' },
}

const CARD_COLORS = {
  ZONAS: '#ffab00', REPORTES: '#2979ff', ALERTAS: '#ff1744', LINEAS: '#00c853',
  SOS: '#d500f9', FAVORITOS: '#ffab00', PARADAS: '#00bcd4', TOTAL: '#2979ff',
}

const CARD_CONFIG = [
  { key: 'zonas_riesgo', icon: '⚠', label: 'ZONAS RIESGO', colorKey: 'ZONAS' },
  { key: 'reportes_activos', icon: '📋', label: 'REPORTES', colorKey: 'REPORTES' },
  { key: 'alertas_no_leidas', icon: '🔔', label: 'ALERTAS', altKey: 'alertas_enviadas', colorKey: 'ALERTAS' },
  { key: 'lineas_transporte', icon: '🚇', label: 'LINEAS TRANS.', colorKey: 'LINEAS' },
  { key: 'eventos_sos', icon: '🆘', label: 'EVENTOS SOS', colorKey: 'SOS' },
  { key: 'favoritos', icon: '⭐', label: 'FAVORITOS', colorKey: 'FAVORITOS' },
  { key: 'paradas', icon: '📍', label: 'PARADAS', colorKey: 'PARADAS' },
  { key: 'total_reportes', icon: '📊', label: 'TOTAL REPORTES', colorKey: 'TOTAL' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [weather, setWeather] = useState(null)
  const [ticker, setTicker] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportHistory, setReportHistory] = useState([])
  const [zoneHistory, setZoneHistory] = useState([])
  const [forecast, setForecast] = useState([])
  const socketStats = useSocket().stats
  const { user, logout } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [statsRes, weatherRes] = await Promise.all([
        api.get('/api/v1/stats'),
        api.get('/api/v1/weather').catch(() => null),
      ])
      setStats(statsRes.data)
      setWeather(weatherRes?.data)
    } catch { showError('Error al cargar datos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/api/v1/predict/congestion/forecast')
      .then(res => setForecast(res.data.forecast || []))
      .catch(() => {})
  }, [])

  const getVal = (s, cfg) => {
    let v = s?.[cfg.key]
    if (v === undefined && cfg.altKey) v = s?.[cfg.altKey]
    return v ?? 0
  }

  useEffect(() => {
    if (!socketStats || !stats) return
    const changes = []
    CARD_CONFIG.forEach(({ key, altKey }) => {
      const oldV = stats[key] ?? stats[altKey]
      const newV = socketStats[key] ?? socketStats[altKey]
      if (oldV !== undefined && newV !== undefined && oldV !== newV) {
        const dir = newV > oldV ? 'up' : 'down'
        changes.push({ label: key.replace(/_/g,' '), oldV, newV, dir })
      }
    })
    if (changes.length) {
      setTicker(t => [
        ...changes.map(c => ({ time: new Date().toLocaleTimeString(), ...c })),
        ...t,
      ].slice(0, 30))
    }
    setStats(prev => prev ? { ...prev, ...socketStats } : socketStats)

    if (socketStats.reportes_por_tipo) {
      setReportHistory(prev => [...prev, { ...socketStats.reportes_por_tipo }].slice(-20))
    }
    if (socketStats.zonas_por_nivel) {
      setZoneHistory(prev => [...prev, { ...socketStats.zonas_por_nivel }].slice(-20))
    }
  }, [socketStats])

  const s = stats || {}

  const latestRpt = reportHistory.length > 0 ? reportHistory[reportHistory.length - 1] : { accidente: 0, bloqueo: 0, robo: 0 }
  const latestZonas = zoneHistory.length > 0 ? zoneHistory[zoneHistory.length - 1] : { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }

  const chartOpts = (label) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#e8eaed',
        bodyColor: '#9aa0a6',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        cornerRadius: 4,
      },
    },
    scales: label?.includes('line') ? {
      x: { grid: { color: 'rgba(42,42,42,0.5)' }, ticks: { color: '#5f6368', font: { size: 9 } } },
      y: { grid: { color: 'rgba(42,42,42,0.5)' }, ticks: { color: '#5f6368', font: { size: 9 } }, beginAtZero: true, max: 100 },
    } : label?.includes('bar') ? {
      x: { grid: { display: false }, ticks: { color: '#5f6368', font: { size: 9 } } },
      y: { grid: { color: 'rgba(42,42,42,0.5)' }, ticks: { color: '#5f6368', font: { size: 9 } }, beginAtZero: true },
    } : {},
  })

  const doughnutData = {
    labels: ['Accidente', 'Bloqueo', 'Robo'],
    datasets: [{
      data: [latestRpt.accidente, latestRpt.bloqueo, latestRpt.robo],
      backgroundColor: ['#ff1744', '#ffab00', '#2979ff'],
      borderWidth: 0,
    }],
  }

  const barData = {
    labels: ['CRIT', 'ALTO', 'MED', 'BAJO'],
    datasets: [{
      label: 'Zonas',
      data: [latestZonas.CRITICO, latestZonas.ALTO, latestZonas.MEDIO, latestZonas.BAJO],
      backgroundColor: ['#ff1744', '#ffab00', '#2979ff', '#00c853'],
      borderRadius: 3,
      borderSkipped: false,
    }],
  }

  const lineData = forecast.length ? {
    labels: forecast.map(f => f.hora_label?.slice(0, 5) ?? ''),
    datasets: [{
      label: 'Congestión %',
      data: forecast.map(f => f.probabilidad ?? 0),
      borderColor: '#2979ff',
      backgroundColor: (ctx) => {
        if (!ctx.chart.chartArea) return 'transparent'
        const { top, bottom } = ctx.chart.chartArea
        const gradient = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom)
        gradient.addColorStop(0, 'rgba(41,121,255,0.25)')
        gradient.addColorStop(1, 'rgba(41,121,255,0.01)')
        return gradient
      },
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.5,
    }],
  } : null

  return (
    <div className="dash-iq">
      <div className="dash-topbar">
        <div className="dash-top-left">
          {weather && (
            <div className="dash-weather">
              <span>🌤️ {weather.temp}°C</span>
              <span className="ws-sep">·</span>
              <span>{weather.condition}</span>
              <span className="ws-sep">·</span>
              <span>💧 {weather.humidity}%</span>
              <span className="ws-sep">·</span>
              <span>🌧️ {weather.rain_prob}%</span>
            </div>
          )}
        </div>
        <div className="dash-top-right">
          <button className="dash-btn dash-btn-mapa" onClick={() => navigate('/mapa')}>
            🗺️ Mapa
          </button>
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
              <AnimatedNumber value={getVal(s, cfg)} />
            </div>
          </div>
        ))}
      </div>

      <div className="dash-charts">
        <div className="chart-card">
          <span className="chart-title">REPORTES POR TIPO</span>
          <div className="chart-wrap"><Doughnut data={doughnutData} options={chartOpts()} /></div>
        </div>
        <div className="chart-card">
          <span className="chart-title">ZONAS POR NIVEL</span>
          <div className="chart-wrap"><Bar data={barData} options={chartOpts('bar')} /></div>
        </div>
        <div className="chart-card chart-card-wide">
          <span className="chart-title">CONGESTIÓN 24H</span>
          <div className="chart-wrap">{lineData && <Line data={lineData} options={chartOpts('line')} />}</div>
        </div>
      </div>

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
              <span className={`ticker-${t.dir}`}>{(t.dir === 'up' ? '↑' : '↓')}</span>
              <span className="ticker-msg">{t.label}</span>
              <span className="ticker-dir">{t.newV}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
