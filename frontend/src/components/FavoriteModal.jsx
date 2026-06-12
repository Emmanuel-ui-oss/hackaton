import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { Star, MapPin } from '../icons'

export default function FavoriteModal({ isOpen, onClose, userPos, coords, onSuccess }) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [favCoords, setFavCoords] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { error: showError, info: showInfo } = useToast()

  useEffect(() => {
    if (coords) setFavCoords(coords)
  }, [coords])

  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    setFavCoords(null)
    setNombre('')
    setDireccion('')
  }

  const submitFav = async () => {
    const coords = favCoords || userPos
    if (!coords) { showError('Selecciona una ubicación en el mapa o usa tu GPS'); return }
    if (!nombre.trim()) { showError('El nombre es obligatorio'); return }
    setSubmitting(true)
    try {
      await api.post('/api/v1/favoritos', {
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        latitud: coords.lat,
        longitud: coords.lng,
      })
      showInfo('Favorito guardado ⭐')
      if (onSuccess) onSuccess()
      handleClose()
    } catch {
      showError('Error al guardar favorito')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <span>Agregar favorito</span>
          <button className="report-modal-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="report-modal-body">
          <label className="report-label">Nombre</label>
          <input className="report-desc" type="text" placeholder="Ej: Casa de la abuela" value={nombre}
            onChange={e => setNombre(e.target.value)} />

          <label className="report-label">Dirección (opcional)</label>
          <input className="report-desc" type="text" placeholder="Ej: Cra 80 # 30-20" value={direccion}
            onChange={e => setDireccion(e.target.value)} />

          <label className="report-label">Ubicación</label>
          <div className="report-location">
            {(favCoords || userPos) ? (
              <span className="report-coords">{(favCoords || userPos).lat.toFixed(5)}, {(favCoords || userPos).lng.toFixed(5)}</span>
            ) : (
              <span className="report-coords report-coords-muted">Haz clic en el mapa para marcar la ubicación</span>
            )}
            {userPos && (
              <button className="report-gps-btn" onClick={() => {
                const pos = { lat: userPos.lat, lng: userPos.lng }
                setFavCoords(pos)
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
                Usar mi ubicación
              </button>
            )}
          </div>
        </div>

        <div className="report-modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={handleClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={submitFav} disabled={submitting || (!favCoords && !userPos)}>
            {submitting ? 'Guardando...' : 'Guardar favorito'}
          </button>
        </div>
      </div>
    </div>
  )
}
