import { useEffect } from 'react'
import api from '../services/api'
import usePageData from '../hooks/usePageData'
import { Clock } from '../icons'

export default function Historial() {
  const { data: viajes, loading, error } = usePageData(() => api.get('/api/v1/historial-viajes'))
  useEffect(() => { if (error) console.error('Error al cargar historial', error) }, [error])

  if (loading) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-state-icon">{Clock}</div>
        <div className="empty-state-text">Cargando historial...</div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{Clock} Historial de Viajes</h1>
        <p className="page-subtitle">Tus rutas y desplazamientos anteriores</p>
      </div>

      {(viajes ?? []).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{Clock}</div>
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
