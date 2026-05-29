import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import './SOSButton.css'

export default function SOSButton() {
  const [activo, setActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useToast()

  const handleSOS = async () => {
    if (activo) {
      try {
        await api.post(`/api/v1/sos/${activo.id}/cerrar`)
        setActivo(null)
        success('SOS desactivado')
      } catch { showError('Error al desactivar SOS') }
      return
    }

    if (!navigator.geolocation) { showError('Geolocalización no disponible'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await api.post(`/api/v1/sos/activar?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
          setActivo(r.data)
          success('🚨 SOS activado — contactos notificados')
        } catch { showError('Error al activar SOS') }
        finally { setLoading(false) }
      },
      () => { showError('No se pudo obtener ubicación'); setLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <button
      className={`sos-btn ${activo ? 'sos-active' : ''}`}
      onClick={handleSOS}
      disabled={loading}
      title={activo ? 'Desactivar SOS' : 'Activar SOS'}
    >
      <span className="sos-inner">
        {loading ? (
          <span className="sos-spinner" />
        ) : activo ? (
          <>
            <span className="sos-pulse" />
            <span className="sos-text">SOS ACTIVO</span>
            <span className="sos-contacts">{activo.contactos_notificados?.length || 0} notif.</span>
          </>
        ) : (
          <>
            <span className="sos-icon">🆘</span>
            <span className="sos-text">SOS</span>
          </>
        )}
      </span>
    </button>
  )
}
