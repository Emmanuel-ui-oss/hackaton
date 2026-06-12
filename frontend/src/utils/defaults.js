export const API_DEFAULTS = {
  '/api/v1/stats': {
    total_reportes: 0, sos_activos: 0, usuarios_activos: 0, zonas_riesgo: 0,
    reportes_hoy: 0, reportes_24h: 0, reportes_semana: 0,
    incidentes_transito_hoy: 0, alertas_no_leidas: 0,
    reportes_por_tipo: [], reportes_por_dia: [],
    comunas: [], overall: 'bajo',
  },
  '/api/v1/zonas-riesgo': [],
  '/api/v1/public/zonas-riesgo': [],
  '/api/v1/reportes': [],
  '/api/v1/contactos-emergencia': [],
  '/api/v1/favoritos': [],
  '/api/v1/alertas': [],
  '/api/v1/historial-viajes': [],
  '/api/v1/trafico/mapa': { comunas: [], overall: 'bajo', hora: '', dia: '' },
  '/api/v1/weather': { temp: 0, condition: '', humidity: 0, icon: '' },
  '/api/v1/weather/forecast': [],
  '/api/v1/predict/congestion/forecast': { predictions: [] },
  '/api/v1/transport': [],
  '/api/v1/public/landing': { comunas: [], weather: null, eventos: [] },
}

export function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌍";
}

export function safe(data, key) {
  if (data == null) return API_DEFAULTS[key] ?? data
  const def = API_DEFAULTS[key]
  if (def === undefined) return data
  if (Array.isArray(def)) return Array.isArray(data) ? data : def
  if (typeof def === 'object' && def !== null) {
    return { ...def, ...data }
  }
  return data
}
