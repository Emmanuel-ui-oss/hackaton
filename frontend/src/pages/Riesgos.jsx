import LandingRiskFeed from '../components/landing/LandingRiskFeed'
import { Warning } from '../icons'

export default function Riesgos() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{Warning.full} Riesgos en tiempo real</h1>
        <p className="page-subtitle">Últimos eventos de riesgo registrados en Medellín con datos de los últimos 30 meses</p>
      </div>
      <LandingRiskFeed />
    </div>
  )
}
