import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import useProgressiveData from '../hooks/useProgressiveData'
import { useSocket } from '../contexts/SocketContext'

import './Mapa.css'
import { MapPin, CloudRain, Droplet, ArrowUp, ArrowDown } from '../icons'
import ReportModal from '../components/ReportModal'
import MapMapLibre from '../maplibre/components/MapLibre'

function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code <= 48) return "🌫️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌦️";
    if (code <= 99) return "⛈️";
    return "🌍";
}

const NIVEL_STYLES = {
  CRITICO: { color: '#ff1744', fill: 'rgba(255,23,68,0.2)', border: 'rgba(255,23,68,0.3)' },
  ALTO:    { color: '#ffab00', fill: 'rgba(255,171,0,0.18)', border: 'rgba(255,171,0,0.3)' },
  MEDIO:   { color: '#2979ff', fill: 'rgba(41,121,255,0.15)', border: 'rgba(41,121,255,0.3)' },
  BAJO:    { color: '#00c853', fill: 'rgba(0,200,83,0.12)', border: 'rgba(0,200,83,0.3)' },
}

const CARD_CONFIG = [
  { key: 'zonas_riesgo', label: 'ZONAS RIESGO' },
  { key: 'reportes_activos', label: 'REPORTES' },
  { key: 'alertas_no_leidas', label: 'ALERTAS', altKey: 'alertas_enviadas' },
  { key: 'eventos_sos', label: 'EVENTOS SOS' },
  { key: 'favoritos', label: 'FAVORITOS' },
  { key: 'total_reportes', label: 'TOTAL REPORTES' },
]

export default function Mapa() {
  const stats = useProgressiveData(() => api.get('/api/v1/stats'))
  const weather = useProgressiveData(() => api.get('/api/v1/weather'))
  const [ticker, setTicker] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCoords, setReportCoords] = useState(null)
  const socketStats = useSocket().stats
  const displayStats = socketStats || stats.data || {}

  useEffect(() => {
    if (!socketStats || !stats.data) return
    const changes = []
    CARD_CONFIG.forEach(({ key, altKey }) => {
      const oldV = stats.data[key] ?? stats.data[altKey]
      const newV = socketStats[key] ?? socketStats[altKey]
      if (oldV !== undefined && newV !== undefined && oldV !== newV) {
        const dir = newV > oldV ? 'up' : 'down'
        changes.push({ label: key.replace(/_/g, ' '), oldV, newV, dir })
      }
    })
    if (changes.length) {
      setTicker(t => [
        ...changes.map(c => ({ time: new Date().toLocaleTimeString(), ...c })),
        ...t,
      ].slice(0, 30))
    }
  }, [socketStats])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }, [])

  const handleMapClick = useCallback((lngLat) => {
    if (!showReportModal) return
    setReportCoords({ lat: lngLat.lat, lng: lngLat.lng })
  }, [showReportModal])

  const openReportModal = () => {
    setShowReportModal(true)
    setReportCoords(userPos ? { lat: userPos.lat, lng: userPos.lng } : null)
  }

  return (
    <div className="page" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>
      <div className="mapa-wrap">
        <div className="map-area">
          {weather.data && createPortal(
            <div className="topbar-weather">
              <span>{getWeatherIcon(weather.data.weather_code)}</span>
              <span>{weather.data.temp}°C</span>
              <span className="ws-sep">·</span>
              <span>{weather.data.condition}</span>
              <span className="ws-sep">·</span>
              <span>{Droplet} {weather.data.humidity}%</span>
              <span className="ws-sep">·</span>
              <span>{CloudRain} {weather.data.rain_prob !== undefined ? `${weather.data.rain_prob}%` : `${weather.data.precipitation || 0}mm`}</span>
              <span className="ws-sep">·</span>
              <span>💨 {weather.data.wind} km/h</span>
            </div>,
            document.getElementById('topbar-weather')
          )}
          {weather.data && createPortal(
            <span>{getWeatherIcon(weather.data.weather_code)} {weather.data.temp}°C <span className="ws-sep">·</span> {weather.data.condition} <span className="ws-sep">·</span> {Droplet} {weather.data.humidity}% <span className="ws-sep">·</span> {CloudRain} {weather.data.rain_prob !== undefined ? `${weather.data.rain_prob}%` : `${weather.data.precipitation || 0}mm`}</span>,
            document.getElementById('sidebar-weather')
          )}

        <MapMapLibre onMapClick={handleMapClick} stats={displayStats} />

        {!stats.isLoading && (
          <div className="dash-riskbar">
            {Object.entries(NIVEL_STYLES).map(([nivel, style]) => {
              const count = displayStats.zonas_por_nivel?.[nivel] ?? 0
              return (
                <div key={nivel} className="riskbar-item" style={{ color: style.color }}>
                  <span className="riskbar-dot" style={{ background: style.color, boxShadow: `0 0 6px ${style.color}` }} />
                  {nivel} <span className="riskbar-count">{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {showReportModal && reportCoords && (
          <div className="mapa-legend" style={{ bottom: 200, right: 12 }}>
            <div className="mapa-legend-item">
              <MapPin />{reportCoords.lat.toFixed(5)}, {reportCoords.lng.toFixed(5)}
            </div>
          </div>
        )}

        <button className="mapa-report-fab" onClick={openReportModal} title="Reportar incidente">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        </div>
      </div>

      <ReportModal isOpen={showReportModal} onClose={() => { setShowReportModal(false); setReportCoords(null) }} userPos={userPos} coords={reportCoords} onCoordsPick={setReportCoords} />
    </div>
  )
}
