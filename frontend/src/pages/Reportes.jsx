import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import usePageData from '../hooks/usePageData'
import { Clipboard, ThumbsUp, ThumbsDown, EmptyBox } from '../icons'
import './Reportes.css'

export default function Reportes() {
  const { data: reportes, loading, load } = usePageData(() => api.get('/api/v1/reportes'))
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

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{Clipboard} Reportes</h1>
        <p className="page-subtitle">Reportes comunitarios de incidentes viales</p>
      </div>

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
    </div>
  )
}
