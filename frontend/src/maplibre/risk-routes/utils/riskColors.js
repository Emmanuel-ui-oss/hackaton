export const NIVEL_COLORS = {
  CRITICO: '#ff1744',
  ALTO: '#ffab00',
  MEDIO: '#2979ff',
  BAJO: '#00c853',
}

export const NIVEL_OPACITIES = {
  CRITICO: 0.9,
  ALTO: 0.8,
  MEDIO: 0.7,
  BAJO: 0.6,
}

export const NIVEL_LABELS = {
  CRITICO: 'Crítico',
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
}

export function getColorByLevel(nivel) {
  return NIVEL_COLORS[nivel] || '#888'
}

export function getOpacityByLevel(nivel) {
  return NIVEL_OPACITIES[nivel] || 0.5
}
