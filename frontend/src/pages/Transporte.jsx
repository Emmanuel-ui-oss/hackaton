import { useState } from 'react'
import api from '../services/api'
import usePageData from '../hooks/usePageData'
import { Train, Bus, CableCar } from '../icons'

export default function Transporte() {
  const { data: lineas, loading } = usePageData(() => api.get('/api/v1/lineas-transporte'))
  const [selected, setSelected] = useState(null)
  const [paradas, setParadas] = useState([])

  const selectLinea = async (l) => {
    setSelected(l)
    try {
      const r = await api.get(`/api/v1/lineas-transporte/${l.id}/paradas`)
      setParadas(r.data || [])
    } catch { setParadas([]) }
  }

  const tipos = [...new Set((lineas ?? []).map(l => l.tipo))]

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🚇 Transporte Público</h1>
        <p className="page-subtitle">Líneas de Metro, Metroplús, Tranvía y Cable</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {tipos.map(t => (
          <div key={t} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              {t === 'METRO' ? <span style={{ color: 'var(--neon-cyan)' }}>{Train}</span> : t === 'METROPLUS' ? <span style={{ color: 'var(--neon-green)' }}>{Bus}</span> : t === 'TRANVIA' ? <span style={{ color: 'var(--neon-purple)' }}>{Train}</span> : t === 'CABLE' ? <span style={{ color: 'var(--neon-amber)' }}>{CableCar}</span> : <span style={{ color: 'var(--text-secondary)' }}>{Bus}</span>}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{t}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(lineas ?? []).filter(l => l.tipo === t).length} líneas</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div>
          <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>Líneas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(lineas ?? []).map(l => (
              <div
                key={l.id}
                className="card"
                style={{ cursor: 'pointer', padding: 16, borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: selected?.id === l.id ? 'var(--blue)' : (l.color || '#2979ff') }}
                onClick={() => selectLinea(l)}
              >
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{l.nombre}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.tipo} · {l.codigo}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>
            {selected ? `Paradas - ${selected.nombre}` : 'Selecciona una línea'}
          </h3>
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {paradas.map((p, i) => (
                <div key={p.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: selected.color || '#2979ff', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                  }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.direccion || `${p.latitud?.toFixed(4)}, ${p.longitud?.toFixed(4)}`}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
