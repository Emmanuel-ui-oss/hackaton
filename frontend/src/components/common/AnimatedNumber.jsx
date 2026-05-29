import { useState, useEffect, useRef } from 'react'

export default function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', flash = true, mono = true }) {
  const [display, setDisplay] = useState(value)
  const [direction, setDirection] = useState(null)
  const prevRef = useRef(value)
  const animRef = useRef(null)

  useEffect(() => {
    if (value === prevRef.current) return
    const start = prevRef.current
    const end = value
    const diff = end - start
    const dir = diff > 0 ? 'up' : 'down'
    setDirection(dir)

    const duration = 400
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + diff * eased
      setDisplay(current)
      if (progress < 1) animRef.current = requestAnimationFrame(animate)
      else {
        setDisplay(end)
        if (flash) setTimeout(() => setDirection(null), 500)
      }
    }
    animRef.current = requestAnimationFrame(animate)
    prevRef.current = end

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [value, flash])

  const formatted = Number(display).toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={`${mono ? 'mono' : ''} ${direction === 'up' ? 'flash-up' : direction === 'down' ? 'flash-down' : ''}`} style={{ transition: 'none' }}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
