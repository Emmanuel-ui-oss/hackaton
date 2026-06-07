const STYLES = {
  line: { height: 14, width: '100%', borderRadius: 4 },
  card: { height: 120, width: '100%', borderRadius: 12 },
  circle: { height: 48, width: 48, borderRadius: '50%' },
  chart: { height: 200, width: '100%', borderRadius: 12 },
  'stat-card': { height: 100, width: '100%', borderRadius: 12 },
}

export default function Skeleton({ variant = 'line', width, height, count = 1, style }) {
  const base = { background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.5s ease-in-out infinite', ...STYLES[variant], ...style }
  if (width) base.width = width
  if (height) base.height = height
  if (variant === 'circle' && width) base.height = width

  const items = Array.from({ length: count }, (_, i) => <div key={i} style={i < count - 1 ? { ...base, marginBottom: 8 } : base} />)

  return (
    <>
      {items}
      <style>{`@keyframes shimmer { 0%,100% { opacity:0.3 } 50% { opacity:0.6 } }`}</style>
    </>
  )
}
