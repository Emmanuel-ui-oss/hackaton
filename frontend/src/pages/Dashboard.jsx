import { useState, useEffect } from 'react'
import api from '../services/api'
import usePageData from '../hooks/usePageData'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import AnimatedNumber from '../components/common/AnimatedNumber'
import { Sun, Droplet, CloudRain, Map as MapIcon } from '../icons'
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

const SVG_ICONS = {
  zonas: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  reportes: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  alertas: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  lineas: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18" r="2.5" /><circle cx="18.5" cy="18" r="2.5" /></svg>,
  sos: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  favoritos: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  paradas: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16.5 16.5" /></svg>,
  total: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
}

const CARD_CONFIG = [
  { key: 'zonas_riesgo', icon: SVG_ICONS.zonas, label: 'ZONAS', colorKey: 'ZONAS' },
  { key: 'reportes_activos', icon: SVG_ICONS.reportes, label: 'REPORTES', colorKey: 'REPORTES' },
  { key: 'alertas_no_leidas', icon: SVG_ICONS.alertas, label: 'ALERTAS', altKey: 'alertas_enviadas', colorKey: 'ALERTAS' },
  { key: 'lineas_transporte', icon: SVG_ICONS.lineas, label: 'LINEAS', colorKey: 'LINEAS' },
  { key: 'eventos_sos', icon: SVG_ICONS.sos, label: 'SOS', colorKey: 'SOS' },
  { key: 'favoritos', icon: SVG_ICONS.favoritos, label: 'FAVS', colorKey: 'FAVORITOS' },
  { key: 'paradas', icon: SVG_ICONS.paradas, label: 'PARADAS', colorKey: 'PARADAS' },
  { key: 'total_reportes', icon: SVG_ICONS.total, label: 'TOTAL', colorKey: 'TOTAL' },
]

export default function Dashboard() {
  const { data: stats, loading, setData } = usePageData(() => api.get('/api/v1/stats'))
  const [weather, setWeather] = useState(null)
  const [ticker, setTicker] = useState([])
  const [reportHistory, setReportHistory] = useState([])
  const [zoneHistory, setZoneHistory] = useState([])
  const [forecast, setForecast] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const socketStats = useSocket().stats
  const wsConnected = useSocket().connected
  const { user, logout } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/v1/weather').then(r => setWeather(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/api/v1/predict/congestion/forecast')
      .then(res => setForecast(res.data.forecast || []))
      .catch(() => {})
  }, [])

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
    setData(prev => prev ? { ...prev, ...socketStats } : socketStats)
    setLastUpdate(new Date())

    if (socketStats.reportes_por_tipo) {
      setReportHistory(prev => [...prev, { accidente: 0, bloqueo: 0, robo: 0, otro: 0, clima: 0, zona_peligrosa: 0, ...socketStats.reportes_por_tipo }].slice(-20))
    }
    if (socketStats.zonas_por_nivel) {
      setZoneHistory(prev => [...prev, { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0, ...socketStats.zonas_por_nivel }].slice(-20))
    }
  }, [socketStats])

  const getVal = (s, cfg) => {
    let v = s?.[cfg.key]
    if (v === undefined && cfg.altKey) v = s?.[cfg.altKey]
    return v ?? 0
  }

  const s = stats || {}

  const latestRpt = { accidente: 0, bloqueo: 0, robo: 0, otro: 0, clima: 0, zona_peligrosa: 0, ...(reportHistory.length > 0 ? reportHistory[reportHistory.length - 1] : {}) }
  const latestZonas = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0, ...(zoneHistory.length > 0 ? zoneHistory[zoneHistory.length - 1] : {}) }

  const chartOpts = (label) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
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

  const lineValues = forecast.length
    ? forecast.map(f => f.probabilidad ?? 0)
    : []

  const lineLabels = forecast.length
    ? forecast.map(f => f.hora_label?.slice(0, 5) ?? '')
    : []

  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: 'Congestión %',
      data: lineValues,
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
  }

  const lastUpdateStr = lastUpdate
    ? `Hace ${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s`
    : '...'

  return (
    <div className="dash-vision">
      <div className="dash-bg-grid" />

      {/* ── TOP BAR ── */}
      <div className="dash-topbar">
        <div className="dash-top-left">
          {weather && (
            <div className="dash-weather">
              <span>{Sun} {weather.temp}°C</span>
              <span className="ws-sep">·</span>
              <span>{weather.condition}</span>
              <span className="ws-sep">·</span>
              <span>{Droplet} {weather.humidity}%</span>
              <span className="ws-sep">·</span>
              <span>{CloudRain} {weather.precipitation ?? weather.rain_prob}%</span>
            </div>
          )}
          <div className="dash-live">
            <span className={`live-dot ${wsConnected ? 'live-on' : 'live-off'}`} />
            <span className="live-text">{lastUpdateStr}</span>
          </div>
        </div>
        <div className="dash-top-right">
          <button className="dash-btn dash-btn-mapa" onClick={() => navigate('/mapa')}>
            {MapIcon} Mapa
          </button>
          <div className="dash-user" onClick={() => navigate('/perfil')}>
            <span className="dash-avatar">{user?.username?.[0]?.toUpperCase()}</span>
            <span className="dash-username">{user?.username}</span>
          </div>
          <button className="dash-btn dash-btn-logout" onClick={() => { logout(); navigate('/login') }}>Salir</button>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="dash-stats">
        {CARD_CONFIG.map(cfg => (
          <div key={cfg.key} className="stat-ticker" style={{ borderTopColor: CARD_COLORS[cfg.colorKey] }}>
            <div className="stat-icon-label">
              <span className="stat-icon-svg">{cfg.icon}</span>
              <span className="stat-label">{cfg.label}</span>
            </div>
            <div className="stat-value" style={{ color: CARD_COLORS[cfg.colorKey] }}>
              <AnimatedNumber value={getVal(s, cfg)} />
            </div>
          </div>
        ))}
      </div>

      {/* ── RISK BAR ── */}
      <div className="dash-riskbar">
        {Object.entries(NIVEL_STYLES).map(([nivel, style]) => {
          const count = stats?.zonas_por_nivel?.[nivel] ?? 0
          return (
            <div key={nivel} className="riskbar-item" style={{ color: style.color }}>
              <span className="riskbar-dot" style={{ background: style.color, boxShadow: `0 0 8px ${style.color}` }} />
              {nivel} <span className="riskbar-count">{count}</span>
            </div>
          )
        })}
      </div>

      {/* ── CHARTS CENTER ── */}
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
          <div className="chart-wrap"><Line data={lineData} options={chartOpts('line')} /></div>
        </div>
      </div>

      {/* ── TICKER ── */}
      <div className="dash-ticker">
        <div className="ticker-header">
          <span className="ticker-led" />
          <span>LIVE TAPE</span>
          <span className="ticker-count">{ticker.length}</span>
        </div>
        <div className="ticker-body">
          {ticker.length === 0 ? (
            <div className="ticker-empty">Esperando cambios...</div>
          ) : (
            ticker.map((t, i) => (
              <div key={i} className="ticker-line">
                <span className="ticker-time">{t.time}</span>
                <span className={`ticker-${t.dir}`}>{t.dir === 'up' ? '▲' : '▼'}</span>
                <span className="ticker-msg">{t.label}</span>
                <span className="ticker-dir">{t.newV}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
