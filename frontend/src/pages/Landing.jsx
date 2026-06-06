import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoginDropdown from '../components/common/LoginDropdown'
import MapBackground from '../components/common/MapBackground'
import SplashMap from '../components/common/SplashMap'
import VisionVialLogo from '../components/common/VisionVialLogo'
import Testimonials from '../components/landing/Testimonials'
import AnimatedPage from '../components/common/AnimatedPage'
import { User, Car, Shield, ArrowDown, SocialX, SocialLinkedIn, Play } from '../icons'
import './Landing.css'

const features = [
  {
    icon: 'map', title: 'Monitoreo en Tiempo Real',
    desc: 'Visualiza incidentes, congestión y condiciones viales al instante en un mapa interactivo con datos actualizados cada 60 segundos.'
  },
  {
    icon: 'brain', title: 'Predicción con ML',
    desc: 'Anticipa congestiones vehiculares y zonas críticas con modelos entrenados en datos históricos de movilidad.'
  },
  {
    icon: 'bell', title: 'Alertas Personalizadas',
    desc: 'Recibe notificaciones sobre condiciones adversas, cierres viales y eventos de riesgo en tus zonas de interés.'
  },
  {
    icon: 'shield', title: 'Zonas de Riesgo',
    desc: 'Identifica áreas con alta probabilidad de accidentes mediante clustering DBSCAN y evalúa rutas más seguras.'
  },
  {
    icon: 'train', title: 'Transporte Público',
    desc: 'Consulta líneas de Metro, Metroplús, Tranvía y Metrocable con paradas, horarios y tiempos estimados.'
  },
  {
    icon: 'phone', title: 'Contactos de Emergencia',
    desc: 'Acceso rápido a números de emergencia y botón SOS con geolocalización para asistencia inmediata.'
  },
]

const featureIcons = {
  map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
  brain: 'M12 2a10 10 0 00-2 19.73V22h4v-.27A10 10 0 0012 2zm6 10a6 6 0 01-4 5.65V20h-4v-2.35A6 6 0 1118 12z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
  train: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3.5-7H6V7h5v3zm2 0V7h5v3h-5zm3.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
  phone: 'M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z',
}

const steps = [
  { num: '1', title: 'Crea tu cuenta', desc: 'Regístrate en segundos y accede a todas las funcionalidades de la plataforma.' },
  { num: '2', title: 'Explora el mapa', desc: 'Navega por el mapa interactivo con capas de incidentes, zonas de riesgo y transporte.' },
  { num: '3', title: 'Configura alertas', desc: 'Selecciona tus zonas de interés y recibe notificaciones en tiempo real.' },
  { num: '4', title: 'Planifica tu ruta', desc: 'Evalúa rutas seguras evitando congestiones y zonas de alto riesgo.' },
]

const audiences = [
  {
    icon: 'Ciudadanos', items: [
      'Rutas seguras a tu destino',
      'Alertas de incidentes cercanos',
      'Reporta incidentes viales',
      'Historial de tus viajes',
    ]
  },
  {
    icon: 'Conductores', items: [
      'Predicción de congestión',
      'Zonas críticas en tu ruta',
      'Monitoreo de condiciones viales',
      'Contactos de emergencia',
    ]
  },
  {
    icon: 'Autoridades', items: [
      'Dashboard con analytics',
      'Datos georreferenciados',
      'Reportes exportables CSV',
      'Detección de zonas críticas',
    ]
  },
]

function AnimatedCounter({ value, suffix, label }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true
        const target = parseInt(value)
        const steps = 30
        const increment = target / steps
        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= target) {
            setCount(target)
            clearInterval(timer)
          } else {
            setCount(Math.floor(current))
          }
        }, 40)
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [value])

  return (
    <div ref={ref} className="landing-stat reveal">
      <div className="landing-stat-value">{count}{suffix}</div>
      <div className="landing-stat-label">{label}</div>
    </div>
  )
}

function FeatureIcon({ name }) {
  const path = featureIcons[name]
  return (
    <svg className="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [splash, setSplash] = useState(true)
  const [dropdownTrigger, setDropdownTrigger] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (splash) return
    const raf = requestAnimationFrame(() => {
      const els = document.querySelectorAll('.reveal')
      if (!els.length) return
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            obs.unobserve(e.target)
          }
        })
      }, { threshold: 0.15 })
      els.forEach(el => obs.observe(el))
      return () => obs.disconnect()
    })
    return () => cancelAnimationFrame(raf)
  }, [splash])

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  if (splash) return <SplashMap />

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <AnimatedPage>
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
          <LoginDropdown trigger={dropdownTrigger} onTriggerDone={() => setDropdownTrigger(null)} />
        </div>
      </header>

      <section id="hero" className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-glow" />
        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <div className="landing-hero-badges">
              <span className="landing-badge"><span className="badge-dot" />PWA</span>
              <span className="landing-badge"><span className="badge-dot" />ML</span>
              <span className="landing-badge"><span className="badge-dot" />Tiempo Real</span>
            </div>
            <h1 className="landing-hero-title">
              Movilidad inteligente<br />para <span className="text-gradient">Medellín</span>
            </h1>
            <p className="landing-hero-subtitle">
              Plataforma predictiva que integra datos en tiempo real, inteligencia artificial y visualización geoespacial para transformar la movilidad urbana.
            </p>
            <div className="landing-hero-actions">
              <button className="btn btn-primary btn-hero" onClick={() => { setDropdownTrigger({ open: true, mode: 'login' }) }}>
                Comenzar gratis
                <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button className="btn btn-ghost btn-hero" onClick={() => scrollTo('como-funciona')}>
                Ver demo
              </button>
            </div>
            <div className="landing-hero-trust">
              <span className="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                Sin instalación
              </span>
              <span className="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                Datos en tiempo real
              </span>
              <span className="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                100% gratuito
              </span>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="device-mockup">
              <div className="device-bezel">
                <div className="device-notch" />
                <div className="device-screen">
                  <div className="mockup-map">
                    <div className="mockup-grid" />
                    <div className="mockup-marker m1" />
                    <div className="mockup-marker m2" />
                    <div className="mockup-marker m3" />
                    <div className="mockup-marker m4" />
                    <div className="mockup-route-line" />
                    <div className="mockup-sidebar">
                      <div className="mockup-sidebar-item" />
                      <div className="mockup-sidebar-item" />
                      <div className="mockup-sidebar-item" />
                    </div>
                    <div className="mockup-stats-bar">
                      <div className="mockup-stat">
                        <span className="mockup-stat-value">16</span>
                        <span className="mockup-stat-label">Comunas</span>
                      </div>
                      <div className="mockup-stat">
                        <span className="mockup-stat-value">8</span>
                        <span className="mockup-stat-label">Líneas</span>
                      </div>
                      <div className="mockup-stat">
                        <span className="mockup-stat-value">25</span>
                        <span className="mockup-stat-label">Eventos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="landing-scroll-indicator" onClick={() => scrollTo('como-funciona')}>
          <span>Descubre más</span>
          <div className="scroll-arrow">{ArrowDown}</div>
        </div>
      </section>

      <section className="landing-stats">
        <div className="landing-stats-inner">
          <AnimatedCounter value={16} suffix="" label="Comunas monitoreadas" />
          <AnimatedCounter value={8} suffix="" label="Líneas de transporte" />
          <AnimatedCounter value={25} suffix="+" label="Eventos en tiempo real" />
          <AnimatedCounter value={24} suffix="/7" label="Monitoreo continuo" />
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
              <div className="landing-feature-icon-wrap">
                <FeatureIcon name={f.icon} />
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
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
              <div className="landing-audience-icon-wrap">
                <span className="landing-audience-icon">{a.icon === 'Ciudadanos' ? <span style={{display:'inline-flex'}}>{User}</span> : a.icon === 'Conductores' ? <span style={{display:'inline-flex'}}>{Car}</span> : <span style={{display:'inline-flex'}}>{Shield}</span>}</span>
              </div>
              <h3 className="landing-audience-title">{a.icon}</h3>
              <ul className="landing-audience-list">
                {a.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Testimonials />

      <section className="landing-cta reveal">
        <div className="landing-cta-card">
          <div className="landing-cta-badge">GRATIS</div>
          <h2 className="landing-cta-title">¿Listo para transformar tu movilidad?</h2>
          <p className="landing-cta-text">Únete a VisionVial y comienza a moverte de forma más inteligente y segura.</p>
          <div className="landing-cta-actions">
            <button className="btn btn-primary btn-hero btn-cta" onClick={() => { setDropdownTrigger({ open: true, mode: 'register' }) }}>
              Crear cuenta gratis
              <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-grid">
            <div className="landing-footer-col landing-footer-brand-col">
              <VisionVialLogo className="landing-footer-logo" />
              <p className="landing-footer-desc">Plataforma de Movilidad Inteligente para Medellín. Datos en tiempo real, predicción ML y alertas personalizadas.</p>
<div className="landing-footer-social">
  <span className="social-icon">{SocialX}</span>
  <span className="social-icon">{SocialLinkedIn}</span>
  <span className="social-icon">{Play}</span>
</div>
            </div>
            <div className="landing-footer-col">
              <h4 className="landing-footer-col-title">Plataforma</h4>
              <a onClick={() => scrollTo('hero')}>Inicio</a>
              <a onClick={() => scrollTo('como-funciona')}>Cómo funciona</a>
              <a onClick={() => scrollTo('funcionalidades')}>Funcionalidades</a>
            </div>
            <div className="landing-footer-col">
              <h4 className="landing-footer-col-title">Recursos</h4>
              <a onClick={() => scrollTo('hero')}>API Docs</a>
              <a onClick={() => scrollTo('hero')}>Centro de ayuda</a>
              <a onClick={() => scrollTo('hero')}>Reportar error</a>
            </div>
            <div className="landing-footer-col">
              <h4 className="landing-footer-col-title">Legal</h4>
              <a onClick={() => scrollTo('hero')}>Términos de uso</a>
              <a onClick={() => scrollTo('hero')}>Privacidad</a>
              <a onClick={() => scrollTo('hero')}>Contacto</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>VisionVial &mdash; HackData CTGI SENA 2026</p>
          </div>
        </div>
      </footer>
      </div>
    </div></AnimatedPage>
  )
}
