export default function Loading({ text = 'Cargando...' }) {
  return (
    <div className="empty-state">
      <div className="spinner" style={{ margin: '0 auto 16px' }} />
      <div className="empty-state-text">{text}</div>
    </div>
  )
}
