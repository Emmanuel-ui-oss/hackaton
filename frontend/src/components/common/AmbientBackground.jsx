import { useEffect, useState } from 'react'

function getTimePalette() {
  const h = new Date().getHours()
  const d = new Date().getDay()
  const isWeekend = d === 0 || d === 6

  if (isWeekend) {
    return {
      primary: 'rgba(0, 230, 118, 0.06)',
      secondary: 'rgba(0, 240, 255, 0.04)',
      accent: 'rgba(41, 121, 255, 0.03)',
    }
  }
  if (h >= 6 && h < 9) {
    return {
      primary: 'rgba(255, 171, 0, 0.07)',
      secondary: 'rgba(255, 23, 68, 0.04)',
      accent: 'rgba(41, 121, 255, 0.03)',
    }
  }
  if (h >= 9 && h < 17) {
    return {
      primary: 'rgba(41, 121, 255, 0.06)',
      secondary: 'rgba(0, 240, 255, 0.04)',
      accent: 'rgba(124, 77, 255, 0.03)',
    }
  }
  if (h >= 17 && h < 20) {
    return {
      primary: 'rgba(255, 23, 68, 0.07)',
      secondary: 'rgba(255, 171, 0, 0.04)',
      accent: 'rgba(124, 77, 255, 0.03)',
    }
  }
  return {
    primary: 'rgba(124, 77, 255, 0.06)',
    secondary: 'rgba(41, 121, 255, 0.03)',
    accent: 'rgba(0, 0, 0, 0.02)',
  }
}

export default function AmbientBackground() {
  const [palette, setPalette] = useState(getTimePalette)

  useEffect(() => {
    const update = () => setPalette(getTimePalette())
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const { primary, secondary, accent } = palette

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -2,
        background: `#080a12`,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 20% 30%, ${primary} 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 70%, ${secondary} 0%, transparent 50%),
            radial-gradient(ellipse 40% 40% at 50% 10%, ${accent} 0%, transparent 40%)
          `,
          transition: 'background 2s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 240, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}
