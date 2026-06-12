import { useState } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import useProgressiveData from '../hooks/useProgressiveData'
import Skeleton from '../components/common/Skeleton'
import { Settings as SettingsIcon, Trash } from '../icons'

export default function Admin() {
  const [tab, setTab] = useState('reportes')
  const { data: reportes, isLoading: loadingR, refetch: refetchR } = useProgressiveData(
    () => api.get('/api/v1/reportes')
  )
  const { data: users, isLoading: loadingU, refetch: refetchU } = useProgressiveData(
    () => api.get('/api/auth/users')
  )
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', email: '', first_name: '', password: '' })
  const { success, error: showError } = useToast()

  const toggleReporte = async (reporte) => {
    try {
      await api.put(`/api/v1/items/${reporte.id}`, { activo: !reporte.activo })
      success(`Reporte ${reporte.activo ? 'ocultado' : 'mostrado'}`)
      refetchR()
    } catch { showError('Error al actualizar reporte') }
  }

  const eliminarReporte = async (reporte) => {
    if (!confirm(`¿Eliminar reporte #${reporte.id} de "${reporte.usuario_username}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/v1/reportes/${reporte.id}`)
      success('Reporte eliminado permanentemente')
      refetchR()
    } catch (err) {
      showError(err?.response?.data?.detail || 'Error al eliminar reporte')
    }
  }

  const handleDeleteUser = async (u) => {
    if (!confirm(`¿Eliminar usuario "${u.username}" (ID ${u.id})? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/auth/users/${u.id}`)
      success('Usuario eliminado')
      refetchU()
    } catch (err) {
      showError(err?.response?.data?.detail || 'Error al eliminar usuario')
    }
  }

  const openEditUser = (u) => {
    setEditingUser(u)
    setEditForm({ username: u.username, email: u.email, first_name: u.first_name, password: '' })
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      await api.put(`/api/auth/users/${editingUser.id}`, editForm)
      success('Usuario actualizado')
      setEditingUser(null)
      refetchU()
    } catch (err) {
      showError(err?.response?.data?.detail || 'Error al actualizar usuario')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{SettingsIcon} Panel de Administración</h1>
        <p className="page-subtitle">Gestión de reportes y usuarios registrados</p>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'reportes' ? 'active' : ''}`} onClick={() => setTab('reportes')}>Reportes</div>
        <div className={`tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>Usuarios Registrados</div>
      </div>

      {tab === 'reportes' && (
        <div className="table-container">
          {loadingR && !reportes ? (
            <div style={{ padding: '1rem' }}><Skeleton variant="line" count={8} /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(reportes ?? []).map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-info">{r.tipo}</span></td>
                    <td>{r.usuario_username}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</td>
                    <td>{r.activo ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>Visible</span> : <span style={{ color: 'var(--text-muted)' }}>Oculto</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className={`btn btn-sm ${r.activo ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleReporte(r)}>
                          {r.activo ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => eliminarReporte(r)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(reportes ?? []).length === 0 && !loadingR && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay reportes registrados.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="table-container">
          {loadingU && !users ? (
            <div style={{ padding: '1rem' }}><Skeleton variant="line" count={8} /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Registro</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.first_name || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.date_joined?.slice(0, 10)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEditUser(u)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u)}>{Trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(users ?? []).length === 0 && !loadingU && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay usuarios registrados.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Editar Usuario — {editingUser.username}</div>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input className="form-input" value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
                <input className="form-input" type="password" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} placeholder="Sin cambios" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
