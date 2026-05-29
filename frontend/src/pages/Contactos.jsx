import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Loading from '../components/common/Loading'

export default function Contactos() {
  const [contactos, setContactos] = useState([])
  const [sosActivo, setSosActivo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '' })
  const { success, error: showError } = useToast()

  const load = () => {
    api.get('/api/v1/contactos-emergencia')
      .then(r => setContactos(r.data || []))
      .catch(() => showError('Error al cargar contactos'))
      .finally(() => setLoading(false))
    api.get('/api/v1/sos').catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.telefono) { showError('Nombre y teléfono son obligatorios'); return }
    try {
      await api.post('/api/v1/contactos-emergencia', form)
      success('Contacto guardado')
      setShowForm(false)
      setForm({ nombre: '', telefono: '', email: '' })
      load()
    } catch { showError('Error al guardar contacto') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/v1/contactos-emergencia/${id}`)
      success('Contacto eliminado')
      load()
    } catch { showError('Error al eliminar') }
  }

  const activarSOS = async () => {
    if (!navigator.geolocation) { showError('Geolocalización no disponible'); return }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await api.post(`/api/v1/sos/activar?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
        setSosActivo(r.data)
        success('🚨 SOS activado! Contactos notificados.')
      } catch { showError('Error al activar SOS') }
    }, () => showError('No se pudo obtener ubicación'))
  }

  const cerrarSOS = async () => {
    if (!sosActivo) return
    try {
      await api.post(`/api/v1/sos/${sosActivo.id}/cerrar`)
      setSosActivo(null)
      success('SOS desactivado')
    } catch { showError('Error al cerrar SOS') }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📞 Contactos de Emergencia</h1>
          <p className="page-subtitle">Tus contactos de confianza</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Añadir</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        {sosActivo ? (
          <button className="btn btn-danger btn-lg" onClick={cerrarSOS} style={{ width: '100%', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
            🆘 DESACTIVAR SOS
          </button>
        ) : (
          <button className="btn btn-danger btn-lg" onClick={activarSOS} style={{ width: '100%', justifyContent: 'center' }}>
            🆘 ACTIVAR SOS
          </button>
        )}
      </div>

      {contactos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📞</div>
          <div className="empty-state-text">No tienes contactos de emergencia</div>
        </div>
      ) : (
        <div className="grid grid-3">
          {contactos.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title" style={{ fontSize: '1rem' }}>{c.nombre}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>📞 {c.telefono}</div>
                  {c.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✉️ {c.email}</div>}
                  {c.relacion && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👤 {c.relacion}</div>}
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(c.id)} style={{ color: 'var(--red)' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nuevo Contacto</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono *</label>
                <input className="form-input" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="3001234567" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
      `}</style>
    </div>
  )
}
