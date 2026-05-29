import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Loading from '../components/common/Loading'

export default function Favoritos() {
  const [favs, setFavs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', direccion: '', latitud: 6.2442, longitud: -75.5812 })
  const { success, error: showError } = useToast()

  const load = () => {
    api.get('/api/v1/favoritos')
      .then(r => setFavs(r.data || []))
      .catch(() => showError('Error al cargar favoritos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.nombre) { showError('El nombre es obligatorio'); return }
    try {
      await api.post('/api/v1/favoritos', form)
      success('Favorito guardado')
      setShowForm(false)
      setForm({ nombre: '', direccion: '', latitud: 6.2442, longitud: -75.5812 })
      load()
    } catch { showError('Error al guardar') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/v1/favoritos/${id}`)
      success('Favorito eliminado')
      load()
    } catch { showError('Error al eliminar') }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">⭐ Favoritos</h1>
          <p className="page-subtitle">Tus lugares guardados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo</button>
      </div>

      {favs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <div className="empty-state-text">No tienes favoritos guardados</div>
        </div>
      ) : (
        <div className="grid grid-3">
          {favs.map(f => (
            <div key={f.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title" style={{ fontSize: '1rem' }}>{f.nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{f.direccion}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{f.latitud?.toFixed(4)}, {f.longitud?.toFixed(4)}</div>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(f.id)} style={{ color: 'var(--red)' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nuevo Favorito</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Casa, Trabajo, etc." autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Dirección" />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Latitud</label>
                  <input className="form-input" type="number" step="any" value={form.latitud} onChange={e => setForm(p => ({ ...p, latitud: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitud</label>
                  <input className="form-input" type="number" step="any" value={form.longitud} onChange={e => setForm(p => ({ ...p, longitud: +e.target.value }))} />
                </div>
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
