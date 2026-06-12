function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function closestPointOnLine(lat, lng, lineCoords) {
  let minD = Infinity, idx = 0
  for (let i = 0; i < lineCoords.length; i++) {
    const d = distKm(lat, lng, lineCoords[i][1], lineCoords[i][0])
    if (d < minD) { minD = d; idx = i }
  }
  return idx
}

function extractParadas(fc) {
  const paradas = []
  if (!fc?.features) return paradas
  for (const f of fc.features) {
    if (f.geometry.type !== 'Point') continue
    const t = f.properties.tipo
    if (t !== 'metro' && t !== 'metro_cable' && t !== 'tranvia') continue
    paradas.push({
      id: `${f.properties.linea_codigo}_${f.properties.nombre}_${f.properties.orden}`,
      nombre: f.properties.nombre,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      orden: f.properties.orden || 0,
      linea_codigo: f.properties.linea_codigo,
      linea_nombre: f.properties.linea_nombre,
      tipo: f.properties.tipo,
    })
  }
  return paradas
}

function extractLines(fc) {
  const lines = {}
  if (!fc?.features) return lines
  for (const f of fc.features) {
    if (f.geometry.type !== 'LineString') continue
    const code = f.properties.codigo
    if (!code) continue
    if (!lines[code]) {
      lines[code] = { codigo: code, coordinates: f.geometry.coordinates, color: f.properties.color, nombre: f.properties.nombre }
    }
  }
  return lines
}

function findNearest(lat, lng, paradas) {
  let minD = Infinity, best = paradas[0]
  for (const p of paradas) {
    const d = distKm(lat, lng, p.lat, p.lng)
    if (d < minD) { minD = d; best = p }
  }
  return best
}

function extractSegmentCoords(lineCoords, idxA, idxB) {
  const segment = lineCoords.slice(Math.min(idxA, idxB), Math.max(idxA, idxB) + 1)
  return idxA <= idxB ? segment : segment.reverse()
}

function buildGraph(paradas) {
  const adj = {}
  for (const p of paradas) {
    adj[p.id] = []
  }
  for (let i = 0; i < paradas.length; i++) {
    for (let j = i + 1; j < paradas.length; j++) {
      const a = paradas[i], b = paradas[j]
      if (a.linea_codigo === b.linea_codigo && Math.abs(a.orden - b.orden) === 1) {
        adj[a.id].push(b.id)
        adj[b.id].push(a.id)
      }
      if (a.linea_codigo !== b.linea_codigo && distKm(a.lat, a.lng, b.lat, b.lng) < 0.1) {
        adj[a.id].push(b.id)
        adj[b.id].push(a.id)
      }
    }
  }
  return adj
}

function bfsShortestPath(adj, startId, endId) {
  if (startId === endId) return [startId]
  const visited = new Set([startId])
  const queue = [[startId]]
  while (queue.length > 0) {
    const path = queue.shift()
    const node = path[path.length - 1]
    for (const neighbor of (adj[node] || [])) {
      if (neighbor === endId) return [...path, neighbor]
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return null
}

function candidatesNear(lat, lng, paradas, radiusKm) {
  const result = []
  for (const p of paradas) {
    if (distKm(lat, lng, p.lat, p.lng) <= radiusKm) result.push(p)
  }
  return result.sort((a, b) => distKm(lat, lng, a.lat, a.lng) - distKm(lat, lng, b.lat, b.lng))
}

function estimateMetroTime(pathParadas) {
  let total = 0
  for (let i = 1; i < pathParadas.length; i++) {
    const a = pathParadas[i - 1], b = pathParadas[i]
    if (a.linea_codigo === b.linea_codigo) {
      total += Math.abs(b.orden - a.orden) * 90
    } else {
      total += distKm(a.lat, a.lng, b.lat, b.lng) / 5 * 3600
    }
  }
  return total
}

function bestEntryExit(originLat, originLng, destLat, destLng, paradas, adj) {
  const entryCandidates = candidatesNear(originLat, originLng, paradas, 2)
  const exitCandidates = candidatesNear(destLat, destLng, paradas, 2)
  if (entryCandidates.length === 0 || exitCandidates.length === 0) {
    return { entry: entryCandidates[0] || findNearest(originLat, originLng, paradas), exit: exitCandidates[0] || findNearest(destLat, destLng, paradas) }
  }

  let bestEntry = null, bestExit = null, bestTotal = Infinity
  const maxChecks = Math.min(entryCandidates.length, 5)
  for (let ei = 0; ei < maxChecks; ei++) {
    const entry = entryCandidates[ei]
    const entryDist = distKm(originLat, originLng, entry.lat, entry.lng)
    const entryWalkTime = entryDist / 5 * 3600

    for (let xi = 0; xi < Math.min(exitCandidates.length, 12); xi++) {
      const exit = exitCandidates[xi]
      const path = bfsShortestPath(adj, entry.id, exit.id)
      if (!path) continue
      const metroTime = estimateMetroTime(path.map(id => paradas.find(p => p.id === id)))
      const exitWalkTime = distKm(destLat, destLng, exit.lat, exit.lng) / 5 * 3600
      const total = entryWalkTime + metroTime + exitWalkTime
      if (total < bestTotal) { bestTotal = total; bestEntry = entry; bestExit = exit }
    }
  }
  return { entry: bestEntry || entryCandidates[0], exit: bestExit || exitCandidates[0] }
}

function buildSegments(pathParadas, lines) {
  const segments = []
  let i = 0
  while (i < pathParadas.length) {
    const cur = pathParadas[i]
    let j = i + 1
    while (j < pathParadas.length && pathParadas[j].linea_codigo === cur.linea_codigo) {
      j++
    }
    const group = pathParadas.slice(i, j)
    if (group.length >= 2) {
      const line = lines[cur.linea_codigo]
      if (line) {
        const first = group[0], last = group[group.length - 1]
        const idxA = closestPointOnLine(first.lat, first.lng, line.coordinates)
        const idxB = closestPointOnLine(last.lat, last.lng, line.coordinates)
        const coords = extractSegmentCoords(line.coordinates, idxA, idxB)
        segments.push({
          type: cur.tipo,
          line: cur.linea_nombre || cur.linea_codigo,
          codigo: cur.linea_codigo,
          color: line.color,
          coords,
          from: first.nombre,
          to: last.nombre,
          stops: Math.abs(last.orden - first.orden),
          duration_s: Math.abs(last.orden - first.orden) * 90,
        })
      }
    }
    if (j < pathParadas.length) {
      const next = pathParadas[j]
      segments.push({
        type: 'transfer',
        line: '',
        codigo: '',
        color: '#888',
        coords: [],
        from: pathParadas[j - 1].nombre,
        to: next.nombre,
        stops: 0,
        duration_s: Math.round(distKm(pathParadas[j - 1].lat, pathParadas[j - 1].lng, next.lat, next.lng) / 5 * 3600),
      })
    }
    i = j
  }
  return segments
}

export default function planMetroRoute(originLat, originLng, destLat, destLng, transportFC) {
  const paradas = extractParadas(transportFC)
  if (paradas.length < 2) return { transportSegments: [], paradaStart: null, paradaEnd: null, transfers: [] }

  const lines = extractLines(transportFC)
  const adj = buildGraph(paradas)
  const { entry: startParada, exit: endParada } = bestEntryExit(originLat, originLng, destLat, destLng, paradas, adj)
  if (!startParada || !endParada) return { transportSegments: [], paradaStart: startParada, paradaEnd: endParada, transfers: [] }

  const pathIds = bfsShortestPath(adj, startParada.id, endParada.id)
  if (!pathIds) return { transportSegments: [], paradaStart: startParada, paradaEnd: endParada, transfers: [] }

  const pathParadas = pathIds.map(id => paradas.find(p => p.id === id))
  const transportSegments = buildSegments(pathParadas, lines)

  return { transportSegments, paradaStart: startParada, paradaEnd: endParada, transfers: [] }
}
