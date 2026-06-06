import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import usePageData from '../hooks/usePageData'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Mapa.css'
import { Warning, Clipboard, Bell, Train, AlertCircle, Star, MapPin, Chart, CloudRain, Droplet, ArrowUp, ArrowDown } from '../icons'
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
  { key: 'zonas_riesgo', icon: Warning, label: 'ZONAS RIESGO', colorKey: 'ZONAS' },
  { key: 'reportes_activos', icon: Clipboard, label: 'REPORTES', colorKey: 'REPORTES' },
  { key: 'alertas_no_leidas', icon: Bell, label: 'ALERTAS', altKey: 'alertas_enviadas', colorKey: 'ALERTAS' },
  { key: 'lineas_transporte', icon: Train, label: 'LINEAS TRANS.', colorKey: 'LINEAS' },
  { key: 'eventos_sos', icon: AlertCircle, label: 'EVENTOS SOS', colorKey: 'SOS' },
  { key: 'favoritos', icon: Star, label: 'FAVORITOS', colorKey: 'FAVORITOS' },
  { key: 'paradas', icon: MapPin, label: 'PARADAS', colorKey: 'PARADAS' },
  { key: 'total_reportes', icon: Chart, label: 'TOTAL REPORTES', colorKey: 'TOTAL' },
]

const REPORT_TYPES = [
  { key: 'accidente', label: 'Accidente', color: '#ff1744', icon: AlertCircle },
  { key: 'bloqueo', label: 'Vía bloqueada', color: '#ffab00', icon: Warning },
  { key: 'zona_peligrosa', label: 'Zona peligrosa', color: '#d500f9', icon: Warning },
  { key: 'robo', label: 'Robo / Hurtos', color: '#ff1744', icon: AlertCircle },
  { key: 'clima', label: 'Inundación / Clima', color: '#00bcd4', icon: CloudRain },
  { key: 'otro', label: 'Otro', color: '#9e9e9e', icon: MapPin },
]

export default function Mapa() {
  const [searchParams] = useSearchParams()
  const { data: stats, loading, setData, load } = usePageData(() => api.get('/api/v1/stats'))
  const [weather, setWeather] = useState(null)
  const [ticker, setTicker] = useState([])
  const [events, setEvents] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('accidente')
  const [reportDesc, setReportDesc] = useState('')
  const [reportCoords, setReportCoords] = useState(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const socketStats = useSocket().stats
  const { error: showError, info: showInfo } = useToast()
  const navigate = useNavigate()

  const mode = searchParams.get('mode') || 'explore'

  useEffect(() => {
    api.get('/api/v1/weather').then(r => setWeather(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socketStats || !stats) return
    const changes = []
    CARD_CONFIG.forEach(({ key, altKey }) => {
      const oldV = stats[key] ?? stats[altKey]
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
    setData(prev => prev ? { ...prev, ...socketStats } : socketStats)
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
    const { lat, lng } = lngLat
    setReportCoords({ lat, lng })
  }, [showReportModal])

  const openReportModal = () => {
    setShowReportModal(true)
    setReportType('accidente')
    setReportDesc('')
    setReportCoords(userPos ? { lat: userPos.lat, lng: userPos.lng } : null)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setReportCoords(null)
  }

  const submitReport = async () => {
    if (!reportCoords) { showError('Selecciona una ubicación en el mapa'); return }
    setReportSubmitting(true)
    try {
      await api.post('/api/v1/reportes', {
        tipo: reportType,
        descripcion: reportDesc,
        latitud: reportCoords.lat,
        longitud: reportCoords.lng,
        ubicacion_texto: `${reportCoords.lat.toFixed(4)}, ${reportCoords.lng.toFixed(4)}`,
      })
      showInfo('Reporte enviado correctamente ✅')
      closeReportModal()
      load()
    } catch {
      showError('Error al enviar reporte')
    } finally { setReportSubmitting(false) }
  }

  return (
    <div className="page" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>
      <div className="mapa-wrap">
        <div className="map-area">
          {weather && createPortal(
            <div className="topbar-weather">
              <span>{getWeatherIcon(weather.weather_code)}</span>
              <span>{weather.temp}°C</span>
              <span className="ws-sep">·</span>
              <span>{weather.condition}</span>
              <span className="ws-sep">·</span>
              <span>{Droplet} {weather.humidity}%</span>
              <span className="ws-sep">·</span>
              <span>{CloudRain} {weather.rain_prob !== undefined ? `${weather.rain_prob}%` : `${weather.precipitation || 0}mm`}</span>
              <span className="ws-sep">·</span>
              <span>💨 {weather.wind} km/h</span>
            </div>,
            document.getElementById('topbar-weather')
          )}

        <MapMapLibre onMapClick={handleMapClick} stats={stats} />

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
                <span className={`ticker-${t.dir}`}>{t.dir === 'up' ? <span style={{display:'inline-flex'}}>{ArrowUp}</span> : <span style={{display:'inline-flex'}}>{ArrowDown}</span>}</span>
                <span className="ticker-msg">{t.label}</span>
                <span className="ticker-dir">{t.newV}</span>
              </div>
            ))
          )}
        </div>

        {events.length > 0 && (
          <div className="mapa-events">
            <div className="mapa-events-title">Eventos ({events.length})</div>
            {events.slice(0, 4).map(e => (
              <div key={e.id} className="mapa-event-item">
                <span className={`badge badge-${e.nivel?.toLowerCase()}`}>{e.nivel}</span>
                {e.titulo?.slice(0, 25)}
              </div>
            ))}
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

      {showReportModal && (
        <div className="report-modal-overlay" onClick={closeReportModal}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <span>Reportar incidente</span>
              <button className="report-modal-close" onClick={closeReportModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="report-modal-body">
              <label className="report-label">Tipo de incidente</label>
              <div className="report-types">
                {REPORT_TYPES.map(t => (
                  <div key={t.key} className={`report-type-btn ${reportType === t.key ? 'active' : ''}`}
                    style={reportType === t.key ? { borderColor: t.color, color: t.color } : {}}
                    onClick={() => setReportType(t.key)}>
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                ))}
              </div>

              <label className="report-label">Ubicación</label>
              <div className="report-location">
                {reportCoords ? (
                  <span className="report-coords">{reportCoords.lat.toFixed(5)}, {reportCoords.lng.toFixed(5)}</span>
                ) : (
                  <span className="report-coords report-coords-muted">Haz clic en el mapa para marcar la ubicación</span>
                )}
                {userPos && (
                  <button className="report-gps-btn" onClick={() => setReportCoords({ lat: userPos.lat, lng: userPos.lng })}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                    Usar mi ubicación
                  </button>
                )}
              </div>

              <label className="report-label">Descripción (opcional)</label>
              <textarea className="report-desc" placeholder="Describe lo que ocurrió..." value={reportDesc}
                onChange={e => setReportDesc(e.target.value)} rows={3} />
            </div>

            <div className="report-modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={closeReportModal}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={submitReport} disabled={reportSubmitting || !reportCoords}>
                {reportSubmitting ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
