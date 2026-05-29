import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Loading from '../components/common/Loading'

export default function Alertas() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [noLeidas, setNoLeidas] = useState(false)
  const { success, error: showError } = useToast()

  const load = () => {
    const url = noLeidas ? '/api/v1/alertas?no_leidas=true' : '/api/v1/alertas'
    api.get(url)
      .then(r => setAlertas(r.data || []))
      .catch(() => showError('Error al cargar alertas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [noLeidas])

  const markRead = async (id) => {
    try {
      await api.post(`/api/v1/alertas/${id}/leer`)
      success('Alerta marcada como leída')
      load()
    } catch { showError('Error al marcar alerta') }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🔔 Alertas</h1>
        <p className="page-subtitle">Notificaciones de seguridad y movilidad</p>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
        <input type="checkbox" checked={noLeidas} onChange={() => setNoLeidas(p => !p)} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Solo no leídas</span>
      </label>

      {alertas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔕</div>
          <div className="empty-state-text">No hay alertas</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alertas.map(a => (
            <div key={a.id} className="card" style={{
              opacity: a.leida ? 0.6 : 1,
              borderLeft: `4px solid ${a.nivel === 'CRITICO' ? '#d32f2f' : a.nivel === 'ALTO' ? '#ff6f00' : a.nivel === 'MEDIO' ? '#fbc02d' : '#388e3c'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span className={`badge badge-${a.nivel?.toLowerCase()}`}>{a.nivel}</span>
                    {!a.leida && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d32f2f', display: 'inline-block' }} />}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{a.mensaje}</p>
                  {a.zona_riesgo && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      📍 {a.zona_riesgo.nombre} · {a.zona_riesgo.comuna}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(a.creado).toLocaleString('es-CO')}
                  </div>
                </div>
                {!a.leida && (
                  <button className="btn btn-sm btn-ghost" onClick={() => markRead(a.id)}>✔</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
