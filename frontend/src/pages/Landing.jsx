import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import LoginDropdown from '../components/common/LoginDropdown'
import MapBackground from '../components/common/MapBackground'
import SplashMap from '../components/common/SplashMap'
import VisionVialLogo from '../components/common/VisionVialLogo'
import './Landing.css'

const features = [
  { icon: '🗺️', title: 'Monitoreo en Tiempo Real', desc: 'Visualiza incidentes, congestión y condiciones viales al instante en un mapa interactivo con datos actualizados cada 60 segundos.' },
  { icon: '🤖', title: 'Predicción con ML', desc: 'Anticipa congestiones vehiculares y zonas críticas con modelos entrenados en datos históricos de movilidad.' },
  { icon: '🔔', title: 'Alertas Personalizadas', desc: 'Recibe notificaciones sobre condiciones adversas, cierres viales y eventos de riesgo en tus zonas de interés.' },
  { icon: '⚠️', title: 'Zonas de Riesgo', desc: 'Identifica áreas con alta probabilidad de accidentes mediante clustering DBSCAN y evalúa rutas más seguras.' },
  { icon: '🚇', title: 'Transporte Público', desc: 'Consulta líneas de Metro, Metroplús, Tranvía y Metrocable con paradas, horarios y tiempos estimados.' },
  { icon: '📞', title: 'Contactos de Emergencia', desc: 'Acceso rápido a números de emergencia y botón SOS con geolocalización para asistencia inmediata.' },
]

const steps = [
  { num: '1', title: 'Crea tu cuenta', desc: 'Regístrate en segundos y accede a todas las funcionalidades de la plataforma.' },
  { num: '2', title: 'Explora el mapa', desc: 'Navega por el mapa interactivo con capas de incidentes, zonas de riesgo y transporte.' },
  { num: '3', title: 'Configura alertas', desc: 'Selecciona tus zonas de interés y recibe notificaciones en tiempo real.' },
  { num: '4', title: 'Planifica tu ruta', desc: 'Evalúa rutas seguras evitando congestiones y zonas de alto riesgo.' },
]

const audiences = [
  {
    icon: '🚶', title: 'Ciudadanos', items: [
      'Rutas seguras a tu destino',
      'Alertas de incidentes cercanos',
      'Reporta incidentes viales',
      'Historial de tus viajes',
    ]
  },
  {
    icon: '🚗', title: 'Conductores', items: [
      'Predicción de congestión',
      'Zonas críticas en tu ruta',
      'Monitoreo de condiciones viales',
      'Contactos de emergencia',
    ]
  },
  {
    icon: '🏛️', title: 'Autoridades', items: [
      'Dashboard con analytics',
      'Datos georreferenciados',
      'Reportes exportables CSV',
      'Detección de zonas críticas',
    ]
  },
]

const stats = [
  { value: '16', label: 'Comunas monitoreadas' },
  { value: '8', label: 'Líneas de transporte' },
  { value: '25+', label: 'Eventos en tiempo real' },
  { value: '24/7', label: 'Monitoreo continuo' },
]

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) } })
    }, { threshold: 0.15 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [splash, setSplash] = useState(true)
  useScrollReveal()

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2600)
    return () => clearTimeout(t)
  }, [])

  if (user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  if (splash) return <SplashMap />

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing">
      <MapBackground />
      <div className="landing-content">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <VisionVialLogo className="landing-brand-logo" />
          </div>
          <nav className="landing-nav">
            <a onClick={() => scrollTo('hero')}>Inicio</a>
            <a onClick={() => scrollTo('como-funciona')}>Cómo funciona</a>
            <a onClick={() => scrollTo('funcionalidades')}>Funcionalidades</a>
          </nav>
          <LoginDropdown />
        </div>
      </header>

      <section id="hero" className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <div className="landing-hero-badges">
              <span className="landing-badge">PWA</span>
              <span className="landing-badge">ML</span>
              <span className="landing-badge">Tiempo Real</span>
            </div>
            <h1 className="landing-hero-title">Movilidad inteligente para <span className="text-gradient">Medellín</span></h1>
            <p className="landing-hero-subtitle">
              Plataforma predictiva que integra datos en tiempo real, inteligencia artificial y visualización geoespacial para transformar la movilidad urbana.
            </p>
            <div className="landing-hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>
                Comenzar
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => scrollTo('como-funciona')}>
                Ver más
              </button>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="map-illustration">
              <div className="map-grid" />
              <div className="map-dot map-dot-1" />
              <div className="map-dot map-dot-2" />
              <div className="map-dot map-dot-3" />
              <div className="map-route" />
              <div className="map-pulse" />
              <div className="map-label map-label-1">Centro</div>
              <div className="map-label map-label-2">Poblado</div>
              <div className="map-label map-label-3">Norte</div>
            </div>
          </div>
        </div>
        <div className="landing-scroll-indicator" onClick={() => scrollTo('como-funciona')}>
          <span>Descubre más</span>
          <div className="scroll-arrow">↓</div>
        </div>
      </section>

      <section id="como-funciona" className="landing-how">
        <div className="landing-section-header reveal">
          <h2>¿Cómo funciona?</h2>
          <p>Cuatro pasos para transformar tu movilidad</p>
        </div>
        <div className="landing-how-grid">
          {steps.map((s, i) => (
            <div key={i} className="landing-how-step reveal">
              <div className="landing-how-num">{s.num}</div>
              <h3 className="landing-how-title">{s.title}</h3>
              <p className="landing-how-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="funcionalidades" className="landing-features">
        <div className="landing-section-header reveal">
          <h2>Todo lo que necesitas</h2>
          <p>Seis funcionalidades clave para una movilidad más segura y eficiente</p>
        </div>
        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div key={i} className="landing-feature-card reveal">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-stats">
        <div className="landing-stats-inner">
          {stats.map((s, i) => (
            <div key={i} className="landing-stat reveal">
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-audience">
        <div className="landing-section-header reveal">
          <h2>Para todos los actores viales</h2>
          <p>VisionVial está diseñada para ciudadanos, conductores y autoridades</p>
        </div>
        <div className="landing-audience-grid">
          {audiences.map((a, i) => (
            <div key={i} className="landing-audience-card reveal">
              <div className="landing-audience-icon">{a.icon}</div>
              <h3 className="landing-audience-title">{a.title}</h3>
              <ul className="landing-audience-list">
                {a.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta reveal">
        <div className="landing-cta-card">
          <h2 className="landing-cta-title">¿Listo para transformar tu movilidad?</h2>
          <p className="landing-cta-text">Únete a VisionVial y comienza a moverte de forma más inteligente y segura.</p>
          <div className="landing-cta-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>Comenzar ahora</button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('/register')}>Crear cuenta gratis</button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <VisionVialLogo className="landing-footer-logo" />
          </div>
          <div className="landing-footer-links">
            <a onClick={() => scrollTo('hero')}>Inicio</a>
            <a onClick={() => scrollTo('como-funciona')}>Cómo funciona</a>
            <a onClick={() => scrollTo('funcionalidades')}>Funcionalidades</a>
          </div>
          <div className="landing-footer-copy">
            <p>VisionVial &mdash; HackData CTGI SENA 2026</p>
            <p className="landing-footer-muted">Plataforma de Movilidad Inteligente</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}
