import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import usePageData from '../hooks/usePageData'
import { Phone, Mail, User, Trash } from '../icons'

export default function Contactos() {
  const { data: contactos, loading, error, load } = usePageData(() => api.get('/api/v1/contactos-emergencia'))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '' })
  const { success, error: showError } = useToast()

  useEffect(() => { if (error) showError('Error al cargar contactos') }, [error])

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
    } catch (err) {
      showError(err?.response?.data?.detail || 'Error al eliminar')
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">{Phone} Contactos de Emergencia</h1>
          <p className="page-subtitle">Tus contactos de confianza</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Añadir</button>
      </div>

      {(contactos ?? []).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{Phone}</div>
          <div className="empty-state-text">No tienes contactos de emergencia</div>
        </div>
      ) : (
        <div className="grid grid-3">
          {contactos.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title" style={{ fontSize: '1rem' }}>{c.nombre}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>{Phone} {c.telefono}</div>
                  {c.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{Mail} {c.email}</div>}
                  {c.relacion && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{User} {c.relacion}</div>}
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(c.id)} style={{ color: 'var(--red)' }}>{Trash}</button>
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

    </div>
  )
}
