import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'

export default function PlanificarRuta() {
  const [origen, setOrigen] = useState({ lat: 6.2442, lng: -75.5812, nombre: 'Centro de Medellín' })
  const [destino, setDestino] = useState({ lat: 6.2150, lng: -75.5600, nombre: 'El Poblado' })
  const [ruta, setRuta] = useState(null)
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useToast()

  const planificar = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`
      )
      const data = await res.json()
      if (data.code !== 'Ok') { showError('No se pudo calcular la ruta'); return }
      const route = data.routes[0]
      setRuta({
        distance: (route.distance / 1000).toFixed(1),
        duration: Math.round(route.duration / 60),
        geometry: route.geometry,
        legs: route.legs,
      })
      success(`Ruta encontrada: ${(route.distance / 1000).toFixed(1)} km`)
    } catch {
      showError('Error al planificar ruta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📍 Planificar Ruta</h1>
        <p className="page-subtitle">Encuentra la mejor ruta entre dos puntos en Medellín</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Origen</label>
            <input className="form-input" value={origen.nombre} onChange={e => setOrigen(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del origen" />
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <input className="form-input" type="number" step="any" value={origen.lat} onChange={e => setOrigen(p => ({ ...p, lat: +e.target.value }))} placeholder="Latitud" />
              <input className="form-input" type="number" step="any" value={origen.lng} onChange={e => setOrigen(p => ({ ...p, lng: +e.target.value }))} placeholder="Longitud" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Destino</label>
            <input className="form-input" value={destino.nombre} onChange={e => setDestino(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del destino" />
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <input className="form-input" type="number" step="any" value={destino.lat} onChange={e => setDestino(p => ({ ...p, lat: +e.target.value }))} placeholder="Latitud" />
              <input className="form-input" type="number" step="any" value={destino.lng} onChange={e => setDestino(p => ({ ...p, lng: +e.target.value }))} placeholder="Longitud" />
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={planificar} disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Calculando...' : '🔍 Buscar Ruta'}
          </button>
        </div>

        {ruta && (
          <div style={{ marginTop: 24 }}>
            <div className="card" style={{ background: 'var(--bg)' }}>
              <div className="grid grid-3" style={{ textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{ruta.distance}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>km</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{ruta.duration}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>minutos</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{origen.nombre}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>→ {destino.nombre}</div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 16 }}>
              💡 Datos de OpenStreetMap (OSRM). Los resultados son aproximados.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
