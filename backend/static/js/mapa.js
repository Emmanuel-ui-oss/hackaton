const Mapa = (() => {
  const CENTRO = [6.2442, -75.5812]
  const ZOOM = 12
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const TILE_ATTR = '&copy; OpenStreetMap contributors'
  const NIVEL_COLORS = {CRITICO: '#8b0000', ALTO: '#e30613', MEDIO: '#f58220', BAJO: '#00a650'}
  const TIPO_ICONS = {
    ACCIDENTE: {icon: '🚗', color: '#e30613'},
    ROBO: {icon: '💰', color: '#1a1a2e'},
    BLOQUEO: {icon: '🚧', color: '#f58220'},
    ZONA_PELIGROSA: {icon: '⚠️', color: '#8b0000'},
    INUNDACION: {icon: '🌊', color: '#0054a6'},
    DESLIZAMIENTO: {icon: '🏔️', color: '#8b4513'},
    MANIFESTACION: {icon: '📢', color: '#9b59b6'},
    OTRO: {icon: '📍', color: '#666'},
  }
  const TRANSPORTE_COLORS = {
    METRO: '#e30613', METROPLUS: '#0054a6', TRANVIA: '#00a650',
    CABLE: '#f58220', BUS: '#9b59b6'
  }

  function createMap(elementId, lat = CENTRO[0], lng = CENTRO[1], zoom = ZOOM) {
    const map = L.map(elementId).setView([lat, lng], zoom)
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map)
    return map
  }

  function nivelColor(nivel) { return NIVEL_COLORS[nivel] || '#666' }

  function addZonas(map, zonas, onClick) {
    const layer = L.layerGroup()
    zonas.forEach(z => {
      const color = nivelColor(z.nivel)
      const circle = L.circle([z.latitud, z.longitud], {
        radius: z.radio_metros || 500,
        color, fillColor: color, fillOpacity: 0.2, weight: 2
      })
      circle.bindPopup(`
        <strong>${z.nombre}</strong><br>
        <span style="color:${color};font-weight:700">${z.nivel}</span> &middot; ${z.tipo_riesgo}<br>
        ${z.comuna}<br>
        <small>${z.descripcion ? z.descripcion.substring(0, 100) : ''}</small>
      `)
      if (onClick) circle.on('click', () => onClick(z))
      layer.addLayer(circle)
    })
    map.addLayer(layer)
    return layer
  }

  function addReportes(map, reportes, onClick) {
    const layer = L.layerGroup()
    reportes.forEach(r => {
      const tipo = TIPO_ICONS[r.tipo] || TIPO_ICONS.OTRO
      const divIcon = L.divIcon({
        html: `<div style="background:${tipo.color};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,.3)">${tipo.icon}</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14]
      })
      const m = L.marker([r.latitud, r.longitud], { icon: divIcon })
      m.bindPopup(`
        <strong>${r.tipo.replace('_', ' ')}</strong><br>
        ${r.descripcion ? r.descripcion.substring(0, 120) : ''}<br>
        <small>${r.ubicacion_texto || ''} &middot; 👍${r.votos_positivos} 👎${r.votos_negativos}</small>
        ${r.foto_url ? `<br><img src="${r.foto_url}" style="max-width:150px;border-radius:4px;margin-top:4px">` : ''}
      `)
      if (onClick) m.on('click', () => onClick(r))
      layer.addLayer(m)
    })
    map.addLayer(layer)
    return layer
  }

  function addLinea(map, linea, paradas) {
    const layer = L.layerGroup()
    const color = TRANSPORTE_COLORS[linea.tipo] || '#666'
    if (paradas.length > 1) {
      const coords = paradas.sort((a, b) => a.orden - b.orden).map(p => [p.latitud, p.longitud])
      L.polyline(coords, { color, weight: 3, opacity: 0.7 }).addTo(layer)
    }
    paradas.sort((a, b) => a.orden - b.orden).forEach(p => {
      const m = L.circleMarker([p.latitud, p.longitud], {
        radius: 5, color: '#fff', fillColor: color, fillOpacity: 1, weight: 2
      })
      m.bindPopup(`<strong>${p.nombre}</strong><br><small>${linea.nombre} &middot; Parada #${p.orden}</small>`)
      layer.addLayer(m)
    })
    map.addLayer(layer)
    return layer
  }

  function addFavoritos(map, favoritos) {
    const layer = L.layerGroup()
    favoritos.forEach(f => {
      const divIcon = L.divIcon({
        html: '<div style="color:#f58220;font-size:24px;text-shadow:0 1px 3px rgba(0,0,0,.3)">⭐</div>',
        className: '', iconSize: [24, 24], iconAnchor: [12, 12]
      })
      const m = L.marker([f.latitud, f.longitud], { icon: divIcon })
      m.bindPopup(`<strong>${f.nombre}</strong><br><small>${f.direccion || ''}</small>`)
      layer.addLayer(m)
    })
    map.addLayer(layer)
    return layer
  }

  function addAlertas(map, alertas) {
    const layer = L.layerGroup()
    alertas.forEach(a => {
      if (!a.zona_riesgo) return
      const z = a.zona_riesgo
      const color = nivelColor(a.nivel)
      const divIcon = L.divIcon({
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:0 0 0 4px ${color}66;animation:pulse 2s infinite">!</div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 16]
      })
      const m = L.marker([z.latitud, z.longitud], { icon: divIcon })
      m.bindPopup(`<strong style="color:${color}">⚠️ ${a.nivel}</strong><br>${a.mensaje}<br><small>${z.nombre} &middot; ${z.comuna}</small>`)
      layer.addLayer(m)
    })
    map.addLayer(layer)
    return layer
  }

  function addLegend(map) {
    const legend = L.control({ position: 'bottomright' })
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-legend')
      div.innerHTML = '<div style="font-weight:700;margin-bottom:4px">Nivel Riesgo</div>' +
        Object.entries(NIVEL_COLORS).map(([k, v]) =>
          `<div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${v};margin-right:6px"></span>${k}</div>`
        ).join('') +
        '<div style="font-weight:700;margin:8px 0 4px">Transporte</div>' +
        Object.entries(TRANSPORTE_COLORS).map(([k, v]) =>
          `<div><span style="display:inline-block;width:12px;height:3px;background:${v};margin-right:6px;vertical-align:middle"></span>${k}</div>`
        ).join('')
      return div
    }
    legend.addTo(map)
    return legend
  }

  function locateUser(map, callback) {
    map.locate({ setView: true, maxZoom: 15 })
    map.on('locationfound', e => {
      L.circleMarker(e.latlng, { radius: 8, color: '#0054a6', fillColor: '#0054a6', fillOpacity: 0.3, weight: 2 }).addTo(map)
      if (callback) callback(e.latlng)
    })
    map.on('locationerror', () => { /* silently fail */ })
  }

  return { createMap, addZonas, addReportes, addLinea, addFavoritos, addAlertas, addLegend, locateUser, CENTRO, ZOOM }
})()
