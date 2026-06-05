import { useRef, useCallback } from 'react'

export default function TiltCard({ children, className = '', maxTilt = 6, style = {} }) {
  const ref = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -maxTilt
    const rotateY = ((x - centerX) / centerX) * maxTilt
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`
    el.style.boxShadow = `
      0 8px 32px rgba(0,0,0,0.3),
      0 0 20px rgba(41,121,255,0.08),
      ${-rotateY * 0.5}px ${-rotateX * 0.5}px 20px rgba(0,240,255,0.06)
    `
  }, [maxTilt])

  const handleMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)'
    el.style.boxShadow = ''
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out' }}
    >
      {children}
    </div>
  )
}
