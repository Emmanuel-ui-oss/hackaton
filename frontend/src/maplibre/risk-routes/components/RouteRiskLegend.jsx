import { NIVEL_COLORS, NIVEL_LABELS } from '../utils/riskColors'

const LEVELS = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']

export default function RouteRiskLegend({ visible }) {
  if (!visible) return null

  return (
    <div className="risk-legend">
      <div className="risk-legend__title">Riesgo</div>
      <div className="risk-legend__items">
        {LEVELS.map(nivel => (
          <div key={nivel} className="risk-legend__item">
            <span
              className="risk-legend__dot"
              style={{ background: NIVEL_COLORS[nivel] }}
            />
            <span className="risk-legend__label">{NIVEL_LABELS[nivel]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
