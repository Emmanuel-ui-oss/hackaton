import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Loading from '../components/common/Loading'

export default function Admin() {
  const [tab, setTab] = useState('zonas')
  const [zonas, setZonas] = useState([])
  const [reportes, setReportes] = useState([])
  const [loading, setLoading] = useState(true)
  const { success, error: showError } = useToast()

  const loadZonas = () => {
    api.get('/api/v1/zonas-riesgo')
      .then(r => setZonas(r.data || []))
      .catch(() => showError('Error al cargar zonas'))
      .finally(() => setLoading(false))
  }

  const loadReportes = () => {
    api.get('/api/v1/reportes')
      .then(r => setReportes(r.data || []))
      .catch(() => showError('Error al cargar reportes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (tab === 'zonas') loadZonas()
    else loadReportes()
  }, [tab])

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

  if (loading && zonas.length === 0 && reportes.length === 0) return <Loading />

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">⚙️ Panel de Administración</h1>
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
              {zonas.map(z => (
                <tr key={z.id}>
                  <td style={{ fontWeight: 600 }}>{z.nombre}</td>
                  <td>{z.comuna}</td>
                  <td><span className={`badge badge-${z.nivel?.toLowerCase()}`}>{z.nivel}</span></td>
                  <td>{z.tipo_riesgo}</td>
                  <td>{z.activo ? <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Activo</span> : <span style={{ color: 'var(--text-muted)' }}>Inactivo</span>}</td>
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
              {reportes.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-info">{r.tipo}</span></td>
                  <td>{r.usuario_username}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</td>
                  <td>{r.activo ? <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Visible</span> : <span style={{ color: 'var(--text-muted)' }}>Oculto</span>}</td>
                  <td>
                    <button className={`btn btn-sm ${r.activo ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleReporte(r)}>
                      {r.activo ? 'Ocultar' : 'Mostrar'}
                    </button>
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
