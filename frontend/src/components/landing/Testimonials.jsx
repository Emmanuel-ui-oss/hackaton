import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import './Testimonials.css'

function StarRating({ rating }) {
  return (
    <div className="testimonial-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`star ${star <= rating ? 'star-filled' : 'star-empty'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Avatar({ name }) {
  return (
    <div className="testimonial-avatar">
      {getInitials(name)}
    </div>
  )
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [promedio, setPromedio] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/public/testimonials')
      const data = res.data
      setTestimonials(data.testimonials || [])
      setPromedio(data.promedio || 0)
      setTotal(data.total || 0)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const itemsPerView = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3
  const maxIndex = Math.max(0, testimonials.length - itemsPerView)

  const next = () => setActiveIndex((prev) => Math.min(prev + 1, maxIndex))
  const prev = () => setActiveIndex((prev) => Math.max(prev - 1, 0))

  if (loading) {
    return (
      <section className="testimonials-section reveal">
        <div className="testimonials-container">
          <div className="testimonials-skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-testimonial" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error || testimonials.length === 0) {
    return null
  }

  return (
    <section className="testimonials-section reveal">
      <div className="testimonials-container">
        <div className="testimonials-header">
          <div className="testimonials-header-left">
            <h2>Lo que dicen nuestros usuarios</h2>
            <p className="testimonials-subtitle">
              Personas reales, resultados reales en la movilidad de Medellín
            </p>
          </div>
          <div className="testimonials-rating-badge">
            <span className="rating-star">★</span>
            <span className="rating-value">{promedio}</span>
            <span className="rating-sep">·</span>
            <span className="rating-count">{total} opiniones</span>
          </div>
        </div>

        <div className="testimonials-track-wrapper">
          <div
            className="testimonials-track"
            style={{
              transform: `translateX(-${activeIndex * (100 / itemsPerView)}%)`,
            }}
          >
            {testimonials.map((t) => (
              <div key={t.id} className="testimonial-card">
                <StarRating rating={t.calificacion} />
                <p className="testimonial-content">"{t.contenido}"</p>
                <div className="testimonial-author">
                  <Avatar name={t.nombre} />
                  <div className="testimonial-author-info">
                    <span className="testimonial-name">{t.nombre}</span>
                    <span className="testimonial-role">{t.rol}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {maxIndex > 0 && (
          <div className="testimonials-nav">
            <button
              className="testimonials-nav-btn"
              onClick={prev}
              disabled={activeIndex === 0}
              aria-label="Anterior"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="testimonials-dots">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  className={`testimonials-dot ${i === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Ir a testimonio ${i + 1}`}
                />
              ))}
            </div>
            <button
              className="testimonials-nav-btn"
              onClick={next}
              disabled={activeIndex >= maxIndex}
              aria-label="Siguiente"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
