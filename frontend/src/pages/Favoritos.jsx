import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import usePageData from '../hooks/usePageData'
import { Star, Trash } from '../icons'

export default function Favoritos() {
  const { data: favs, loading, load } = usePageData(() => api.get('/api/v1/favoritos'))
  const { success, error: showError } = useToast()

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/v1/favoritos/${id}`)
      success('Favorito eliminado')
      load()
    } catch (err) {
      showError(err?.response?.data?.detail || 'Error al eliminar')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{Star} Favoritos</h1>
          <p className="page-subtitle">Tus lugares guardados</p>
        </div>
      </div>

      {(favs ?? []).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{Star}</div>
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
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(f.id)} style={{ color: 'var(--red)' }}>{Trash}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
