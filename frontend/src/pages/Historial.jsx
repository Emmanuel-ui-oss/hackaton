import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Loading from '../components/common/Loading'

export default function Historial() {
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const { error: showError } = useToast()

  useEffect(() => {
    api.get('/api/v1/historial-viajes')
      .then(r => setViajes(r.data || []))
      .catch(() => showError('Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🕐 Historial de Viajes</h1>
        <p className="page-subtitle">Tus rutas y desplazamientos anteriores</p>
      </div>

      {viajes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕐</div>
          <div className="empty-state-text">No hay viajes registrados</div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Origen</th>
                <th>Destino</th>
                <th>Distancia</th>
                <th>Tiempo</th>
                <th>Costo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {viajes.map(v => (
                <tr key={v.id}>
                  <td>{v.origen_nombre}</td>
                  <td>{v.destino_nombre}</td>
                  <td>{v.distancia_km ? `${v.distancia_km.toFixed(1)} km` : '-'}</td>
                  <td>{v.tiempo_min ? `${v.tiempo_min} min` : '-'}</td>
                  <td>{v.costo_estimado ? `$${v.costo_estimado}` : '-'}</td>
                  <td>{new Date(v.creado).toLocaleDateString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
