import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 30

export default function ParticleBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const existing = container.querySelectorAll('.particle')
    if (existing.length > 0) return

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement('div')
      el.className = 'particle'
      el.style.left = `${Math.random() * 100}%`
      el.style.top = `${Math.random() * 100}%`
      el.style.width = `${1 + Math.random() * 2}px`
      el.style.height = el.style.width
      el.style.animationDelay = `${Math.random() * 12}s`
      el.style.animationDuration = `${10 + Math.random() * 8}s`
      el.style.background = i % 3 === 0 ? 'var(--neon-cyan)' : i % 3 === 1 ? 'var(--neon-blue)' : 'var(--neon-purple)'
      container.appendChild(el)
    }
  }, [])

  return <div ref={ref} className="particles-container" />
}
