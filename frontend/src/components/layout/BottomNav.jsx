import { NavLink } from 'react-router-dom'

const items = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/mapa', icon: '🗺️', label: 'Mapa' },
  { to: '/reportes', icon: '📋', label: 'Reportes' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/perfil', icon: '👤', label: 'Perfil' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-items">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-item-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
