import { useState } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import usePageData from '../hooks/usePageData'
import { Clipboard, ThumbsUp, ThumbsDown, EmptyBox } from '../icons'
import './Reportes.css'

export default function Reportes() {
  const { data: reportes, loading, load } = usePageData(() => api.get('/api/v1/reportes'))
  const [tab, setTab] = useState('list')
  const [form, setForm] = useState({ tipo: 'otro', descripcion: '', ubicacion_texto: '', latitud: 6.2442, longitud: -75.5812 })
  const { success, error: showError } = useToast()

  const handleVote = async (id, positivo) => {
    try {
      await api.post(`/api/v1/reportes/${id}/votar`, { positivo })
      success('Voto registrado')
      load()
    } catch (err) {
      showError(err.response?.data?.detail || 'Error al votar')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.descripcion) { showError('La descripción es obligatoria'); return }
    try {
      await api.post('/api/v1/reportes', form)
      success('Reporte creado')
      setForm({ tipo: 'otro', descripcion: '', ubicacion_texto: '', latitud: 6.2442, longitud: -75.5812 })
      setTab('list')
      load()
    } catch (err) {
      showError(err.response?.data?.detail || 'Error al crear reporte')
    }
  }

  const tipos = ['accidente', 'bloqueo', 'zona_peligrosa', 'robo', 'clima', 'otro']

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{Clipboard} Reportes</h1>
        <p className="page-subtitle">Reportes comunitarios de incidentes viales</p>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Lista de Reportes</div>
        <div className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Nuevo Reporte</div>
      </div>

      {tab === 'list' && (
        <div className="table-container">
          {(reportes ?? []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{EmptyBox}</div>
              <div className="empty-state-text">No hay reportes aún</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th>Votos</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                  {reportes.map(r => (
                      <tr key={r.id}>
                        <td data-label="Tipo"><span className={`badge badge-${r.tipo === 'accidente' ? 'critico' : r.tipo === 'bloqueo' ? 'alto' : 'info'}`}>{r.tipo}</span></td>
                        <td data-label="Descripción" style={{ maxWidth: '40vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</td>
                        <td data-label="Usuario">{r.usuario_username}</td>
                        <td data-label="Votos">{ThumbsUp} {r.votos_positivos} {ThumbsDown} {r.votos_negativos}</td>
                        <td data-label="Acción">
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleVote(r.id, true)}>{ThumbsUp}</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleVote(r.id, false)}>{ThumbsDown}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'create' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {tipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Describe el incidente..." required />
            </div>
            <div className="form-group">
              <label className="form-label">Ubicación</label>
              <div className="reportes-location-row">
                <input className="form-input" style={{ flex: 1 }} value={form.ubicacion_texto} onChange={e => setForm(p => ({ ...p, ubicacion_texto: e.target.value }))} placeholder="Dirección o referencia" />
                <button type="button" className="btn btn-ghost" onClick={() => {
                  if (!navigator.geolocation) { showError('Geolocalización no disponible'); return }
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      setForm(p => ({ ...p, latitud: pos.coords.latitude, longitud: pos.coords.longitude, ubicacion_texto: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }))
                      success('Ubicación obtenida')
                    },
                    () => showError('No se pudo obtener la ubicación'),
                    { enableHighAccuracy: true, timeout: 10000 }
                  )
                }}>📍 Obtener ubicación</button>
              </div>
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
            <button className="btn btn-primary" type="submit">Enviar Reporte</button>
          </form>
        </div>
      )}
    </div>
  )
}
