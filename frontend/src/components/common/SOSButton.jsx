import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'
import { useSocket } from '../../contexts/SocketContext'
import { useToast } from '../../contexts/ToastContext'
import { AlertCircle } from '../../icons'
import './SOSButton.css'

export default function SOSButton() {
  const [activo, setActivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tiempo, setTiempo] = useState(0)
  const { success, error: showError } = useToast()
  const { stats: socketStats } = useSocket()
  const intervalRef = useRef(null)
  const locationIntervalRef = useRef(null)
  const activatedAt = useRef(null)
  useEffect(() => {
    api.get('/api/v1/sos/activo').then(r => {
      if (r.data.activo && r.data.sos) {
        const sos = r.data.sos
        setActivo(sos)
        activatedAt.current = new Date(sos.creado)
        const segundos = Math.floor((Date.now() - new Date(sos.creado).getTime()) / 1000)
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
    const miUsername = localStorage.getItem('user')
    let miUserId = null
    try { miUserId = JSON.parse(miUsername)?.username } catch {}
    const tengoActivo = misSos.some(s => s.username === miUserId)
    if (!tengoActivo && activo) {
      setActivo(null)
      setTiempo(0)
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
    </>
  )
}
