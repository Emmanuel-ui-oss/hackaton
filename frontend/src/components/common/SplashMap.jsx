import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import VisionVialLogo from './VisionVialLogo'
import './SplashMap.css'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

const markers = [
  { lat: 6.2476, lng: -75.5658, color: '#ff1744', label: 'CRÍTICO' },
  { lat: 6.2200, lng: -75.5800, color: '#ffab00', label: 'ALTO' },
  { lat: 6.2600, lng: -75.5500, color: '#2979ff', label: 'MEDIO' },
  { lat: 6.2000, lng: -75.5700, color: '#00c853', label: 'BAJO' },
  { lat: 6.2350, lng: -75.5950, color: '#ff1744', label: 'CRÍTICO' },
  { lat: 6.2700, lng: -75.5300, color: '#ffab00', label: 'ALTO' },
  { lat: 6.2100, lng: -75.5550, color: '#2979ff', label: 'MEDIO' },
]

export default function SplashMap() {
  const ref = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return

    const map = L.map(ref.current, {
      center: [6.2476, -75.5658],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    })

    L.tileLayer(TILE_URL, { maxZoom: 19, minZoom: 12, noWrap: true }).addTo(map)

    markers.forEach((m, i) => {
      const el = L.divIcon({
        html: `<div class="splash-marker" style="--color: ${m.color}; animation-delay: ${i * 0.3}s"><span class="splash-marker-dot"></span><span class="splash-marker-ring"></span></div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      L.marker([m.lat, m.lng], { icon: el }).addTo(map)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="splash">
      <div ref={ref} className="splash-map" />
      <div className="splash-overlay" />
      <div className="splash-center">
        <VisionVialLogo showTagline className="splash-logo-svg" />
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  )
}
