import { useState } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import usePageData from '../hooks/usePageData'
import { Settings as SettingsIcon } from '../icons'

export default function Admin() {
  const [tab, setTab] = useState('zonas')
  const { data: zonas, loading: loadingZ, load: loadZonas } = usePageData(
    () => api.get('/api/v1/zonas-riesgo'),
    tab === 'zonas'
  )
  const { data: reportes, loading: loadingR, load: loadReportes } = usePageData(
    () => api.get('/api/v1/reportes'),
    tab === 'reportes'
  )
  const loading = tab === 'zonas' ? loadingZ : loadingR
  const { success, error: showError } = useToast()

  const toggleZona = async (zona) => {
    try {
      await api.put(`/api/v1/zonas-riesgo/${zona.id}`, { activo: !zona.activo })
      success(`Zona ${zona.activo ? 'desactivada' : 'activada'}`)
      loadZonas()
    } catch { showError('Error al actualizar zona') }
  }

  const toggleReporte = async (reporte) => {
    try {
      await api.put(`/api/v1/items/${reporte.id}`, { activo: !reporte.activo })
      success(`Reporte ${reporte.activo ? 'ocultado' : 'mostrado'}`)
      loadReportes()
    } catch { showError('Error al actualizar reporte') }
  }

  const eliminarReporte = async (reporte) => {
    if (!confirm(`¿Eliminar reporte #${reporte.id} de "${reporte.usuario_username}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/v1/reportes/${reporte.id}`)
      success('Reporte eliminado permanentemente')
      loadReportes()
    } catch { showError('Error al eliminar reporte') }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{SettingsIcon} Panel de Administración</h1>
        <p className="page-subtitle">Gestión de zonas de riesgo y reportes</p>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'zonas' ? 'active' : ''}`} onClick={() => setTab('zonas')}>Zonas de Riesgo</div>
        <div className={`tab ${tab === 'reportes' ? 'active' : ''}`} onClick={() => setTab('reportes')}>Reportes</div>
      </div>

      {tab === 'zonas' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Comuna</th>
                <th>Nivel</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {(zonas ?? []).map(z => (
                <tr key={z.id}>
                  <td style={{ fontWeight: 600 }}>{z.nombre}</td>
                  <td>{z.comuna}</td>
                  <td><span className={`badge badge-${z.nivel?.toLowerCase()}`}>{z.nivel}</span></td>
                  <td>{z.tipo_riesgo}</td>
                  <td>{z.activo ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>Activo</span> : <span style={{ color: 'var(--text-muted)' }}>Inactivo</span>}</td>
                  <td>
                    <button className={`btn btn-sm ${z.activo ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleZona(z)}>
                      {z.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reportes' && (
        <div className="table-container">
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
