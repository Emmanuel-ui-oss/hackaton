import { NavLink } from 'react-router-dom'
import VisionVialLogo from '../common/VisionVialLogo'

const mainNav = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/mapa', icon: '🗺️', label: 'Mapa' },
  { to: '/planificar-ruta', icon: '📍', label: 'Rutas' },
  { to: '/zonas', icon: '⚠️', label: 'Zonas' },
  { to: '/reportes', icon: '📋', label: 'Reportes' },
  { to: '/transporte', icon: '🚇', label: 'Transporte' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/favoritos', icon: '⭐', label: 'Favoritos' },
  { to: '/contactos', icon: '📞', label: 'Emergencia' },
  { to: '/historial', icon: '🕐', label: 'Historial' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99 }} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <VisionVialLogo className="sidebar-brand-logo" />
          <div className="sidebar-brand-sub">Plataforma de Movilidad</div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Principal</div>
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section-label">Administración</div>
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-item-icon">⚙️</span>
            Panel Admin
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/perfil" className="nav-item" onClick={onClose}>
            <span className="nav-item-icon">👤</span>
            Mi Perfil
          </NavLink>
        </div>
      </aside>
    </>
  )
}
