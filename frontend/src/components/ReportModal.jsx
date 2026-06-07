import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { Warning, AlertCircle, CloudRain, MapPin } from '../icons'

const REPORT_TYPES = [
  { key: 'accidente', label: 'Accidente', color: '#ff1744', icon: AlertCircle },
  { key: 'bloqueo', label: 'Vía bloqueada', color: '#ffab00', icon: Warning },
  { key: 'zona_peligrosa', label: 'Zona peligrosa', color: '#d500f9', icon: Warning },
  { key: 'robo', label: 'Robo / Hurtos', color: '#ff1744', icon: AlertCircle },
  { key: 'clima', label: 'Inundación / Clima', color: '#00bcd4', icon: CloudRain },
  { key: 'otro', label: 'Otro', color: '#9e9e9e', icon: MapPin },
]

export default function ReportModal({ isOpen, onClose, userPos, coords, onCoordsPick }) {
  const [reportType, setReportType] = useState('accidente')
  const [reportDesc, setReportDesc] = useState('')
  const [reportCoords, setReportCoords] = useState(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const { error: showError, info: showInfo } = useToast()

  useEffect(() => {
    if (coords) setReportCoords(coords)
  }, [coords])

  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    setReportCoords(null)
    setReportDesc('')
    setReportType('accidente')
  }

  const submitReport = async () => {
    const coords = reportCoords || userPos
    if (!coords) { showError('Selecciona una ubicación en el mapa o usa tu GPS'); return }
    setReportSubmitting(true)
    try {
      await api.post('/api/v1/reportes', {
        tipo: reportType,
        descripcion: reportDesc,
        latitud: coords.lat,
        longitud: coords.lng,
        ubicacion_texto: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      })
      showInfo('Reporte enviado correctamente ✅')
      handleClose()
    } catch {
      showError('Error al enviar reporte')
    } finally { setReportSubmitting(false) }
  }

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <span>Reportar incidente</span>
          <button className="report-modal-close" onClick={handleClose}>
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
            {(reportCoords || userPos) ? (
              <span className="report-coords">{(reportCoords || userPos).lat.toFixed(5)}, {(reportCoords || userPos).lng.toFixed(5)}</span>
            ) : (
              <span className="report-coords report-coords-muted">Haz clic en el mapa para marcar la ubicación</span>
            )}
            {userPos && (
              <button className="report-gps-btn" onClick={() => {
                const pos = { lat: userPos.lat, lng: userPos.lng }
                setReportCoords(pos)
                if (onCoordsPick) onCoordsPick(pos)
              }}>
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
          <button className="btn btn-secondary btn-sm" onClick={handleClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={submitReport} disabled={reportSubmitting || (!reportCoords && !userPos)}>
            {reportSubmitting ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </div>
  )
}
