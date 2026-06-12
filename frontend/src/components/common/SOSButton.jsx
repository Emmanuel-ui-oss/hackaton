import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'
import { useSocket } from '../../contexts/SocketContext'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { AlertCircle } from '../../icons'
import useSOSEnlaces from '../../hooks/useSOSEnlaces'
import './SOSButton.css'

export default function SOSButton() {
  const [activo, setActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tiempo, setTiempo] = useState(0)
  const [showActions, setShowActions] = useState(false)
  const { success, error: showError } = useToast()
  const { stats: socketStats } = useSocket()
  const { user } = useAuth()
  const intervalRef = useRef(null)
  const locationIntervalRef = useRef(null)
  const activatedAt = useRef(null)
  const enlaces = useSOSEnlaces(activo?.id)

  useEffect(() => {
    api.get('/api/v1/sos/activo').then(r => {
      if (r.data.activo && r.data.sos) {
        const sos = r.data.sos
        const creado = new Date(sos.creado)
        if (Date.now() - creado.getTime() > 30 * 60 * 1000) {
          api.post(`/api/v1/sos/${sos.id}/cerrar`).catch(() => {})
          return
        }
        setActivo(sos)
        activatedAt.current = creado
        const segundos = Math.floor((Date.now() - creado.getTime()) / 1000)
        setTiempo(segundos)
      }
    }).catch(() => {})
  }, [])

  async function obtenerUbicacion() {
    if (!navigator.geolocation) {
      console.warn('[SOS] Geolocation no disponible, probando IP...')
      try { return await ubicacionPorIP() } catch { return { lat: 0, lng: 0 } }
    }
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject,
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 })
      })
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch (e) {
      console.warn('[SOS] GPS rápido falló (' + e.message + '), probando IP...')
    }
    try { return await ubicacionPorIP() } catch { return { lat: 0, lng: 0 } }
  }

  async function ubicacionPorIP() {
    const r = await fetch('https://ipapi.co/json/')
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const d = await r.json()
    if (!d.latitude || !d.longitude) throw new Error('sin coordenadas')
    return { lat: d.latitude, lng: d.longitude }
  }

  useEffect(() => {
    if (!socketStats?.sos_activos) return
    const misSos = socketStats.sos_activos || []
    const miUsername = user?.username
    const tengoActivo = misSos.some(s => s.username === miUsername)
    if (!tengoActivo && activo) {
      setActivo(null)
      setTiempo(0)
      setShowActions(false)
      activatedAt.current = null
      success('SOS desactivado por el servidor')
    }
  }, [socketStats?.sos_activos])

  useEffect(() => {
    if (activo) {
      intervalRef.current = setInterval(() => {
        setTiempo(t => t + 1)
      }, 1000)

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      locationIntervalRef.current = setInterval(() => {
        obtenerUbicacion()
          .then(pos => {
            api.post(`/api/v1/sos/${activo.id}/ubicacion`, {
              latitud: pos.lat,
              longitud: pos.lng,
            }).catch(() => {})
          })
          .catch(() => {
            console.warn('[SOS] Ubicación periódica no disponible')
          })
      }, 10000)
    } else {
      clearInterval(intervalRef.current)
      clearInterval(locationIntervalRef.current)
      intervalRef.current = null
      locationIntervalRef.current = null
    }
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(locationIntervalRef.current)
    }
  }, [activo])

  const handleSOS = useCallback(async () => {
    if (activo) {
      try {
        await api.post(`/api/v1/sos/${activo.id}/cerrar`)
        setActivo(null)
        setTiempo(0)
        setShowActions(false)
        activatedAt.current = null
        if ('vibrate' in navigator) navigator.vibrate(100)
        success('SOS desactivado')
      } catch { showError('Error al desactivar SOS') }
      return
    }

    setLoading(true)
    const pos = await obtenerUbicacion()
    for (let i = 0; i < 3; i++) {
      try {
        const r = await api.post(`/api/v1/sos/activar?lat=${pos.lat}&lng=${pos.lng}`)
        setActivo(r.data)
        activatedAt.current = new Date()
        setTiempo(0)
        setShowActions(true)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 SOS Activado', {
            body: 'Tus contactos de emergencia han sido notificados.',
            icon: '/static/img/icon.svg',
          })
        }
        const u = r.data.usuario || {}
        const nombre = u.nombre_completo || ''
        const email = u.email || ''
        const telefono = u.telefono || ''
        const info = [nombre, email, telefono].filter(Boolean).join(' · ')
        try { if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]) } catch {}
        success(`🚨 SOS activado — ${info || 'contactos notificados'}`)
        break
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.detail?.includes('Ya tienes un SOS activo')) {
          try {
            const r = await api.get('/api/v1/sos/activo')
            if (r.data.activo && r.data.sos) {
              setActivo(r.data.sos)
              activatedAt.current = new Date(r.data.sos.creado)
              setTiempo(Math.floor((Date.now() - new Date(r.data.sos.creado).getTime()) / 1000))
              setShowActions(true)
              success('SOS ya estaba activo — continuando monitoreo')
            }
          } catch {}
          break
        }
        if (err.response?.status === 429) {
          showError('Demasiadas solicitudes. Espera un momento antes de activar SOS.')
          break
        }
        if (i === 2) showError('Error al activar SOS. Verifica tu conexión a internet.')
        else await new Promise(r => setTimeout(r, 1000))
      }
    }
    setLoading(false)
  }, [activo, success, showError])

  const formatTiempo = (s) => {
    const m = Math.floor(s / 60)
    const seg = s % 60
    return `${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
  }

  const abrirWhatsApp = (url) => {
    window.open(url, '_blank', 'noopener')
  }

  const llamar = (telefono) => {
    window.location.href = `tel:${telefono}`
  }

  return (
    <>
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
            <span className="sos-timer">{formatTiempo(tiempo)}</span>
            <span className="sos-contacts">{activo.contactos_notificados?.length || 0} notif.</span>
          </>
        ) : (
          <>
            <span className="sos-icon">{AlertCircle}</span>
            <span className="sos-text">SOS</span>
          </>
        )}
      </span>
    </button>

    {showActions && activo && enlaces && (
      <div className="sos-actions">
        {enlaces.whatsapp?.length > 0 && (
          <div className="sos-actions-group">
            <span className="sos-actions-label">WhatsApp</span>
            {enlaces.whatsapp.map((w, i) => (
              <button key={i} className="sos-action-btn sos-whatsapp" onClick={() => abrirWhatsApp(w.url)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {w.nombre}
              </button>
            ))}
          </div>
        )}
        <div className="sos-actions-group">
          <span className="sos-actions-label">Llamar emergencia</span>
          <div className="sos-actions-call-group">
            {enlaces.emergencia?.map((e, i) => (
              <button key={i} className="sos-action-btn sos-call" onClick={() => llamar(e.telefono)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                {e.nombre}
              </button>
            ))}
          </div>
        </div>
        <button className="sos-actions-close" onClick={() => setShowActions(false)}>
          Ocultar
        </button>
      </div>
    )}
    </>
  )
}
