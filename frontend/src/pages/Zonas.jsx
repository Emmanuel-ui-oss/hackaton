import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Loading from '../components/common/Loading'
import { Warning as WarningIcon, MapPin, Search, Circle } from '../icons'

export default function Zonas() {
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const { error: showError } = useToast()

  useEffect(() => {
    api.get('/api/v1/zonas-riesgo')
      .then(r => setZonas(r.data || []))
      .catch(() => showError('Error al cargar zonas'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = zonas.filter(z =>
    !filter || z.nombre.toLowerCase().includes(filter.toLowerCase()) || z.comuna?.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{WarningIcon.full} Zonas de Riesgo</h1>
        <p className="page-subtitle">Áreas identificadas con riesgo en Medellín</p>
      </div>

      <div className="form-group" style={{ maxWidth: 400, marginBottom: 20 }}>
        <input className="form-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nombre o comuna..." />
      </div>

      <div className="grid grid-3">
        {filtered.map(z => (
          <div key={z.id} className="card" style={{ borderLeft: `4px solid ${z.nivel === 'CRITICO' ? '#d32f2f' : z.nivel === 'ALTO' ? '#ff6f00' : z.nivel === 'MEDIO' ? '#fbc02d' : '#388e3c'}` }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '1rem' }}>{z.nombre}</div>
              <span className={`badge badge-${z.nivel?.toLowerCase()}`}>{z.nivel}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              <div>{MapPin.withDot} {z.comuna}</div>
              <div><Circle color="#ff1744" /> {z.tipo_riesgo}</div>
              <div>{MapPin.withDot} {z.latitud?.toFixed(4)}, {z.longitud?.toFixed(4)}</div>
            </div>
            {z.descripcion && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{z.descripcion}</p>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">{Search}</div>
          <div className="empty-state-text">No se encontraron zonas</div>
        </div>
      )}
    </div>
  )
}
