import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import SOSButton from '../common/SOSButton'
import Toast from '../common/Toast'
import { useToast } from '../../contexts/ToastContext'
import Chatbot from '../Chatbot/Chatbot'
import { Menu } from '../../icons'
import AmbientBackground from '../common/AmbientBackground'
import ParticleBackground from '../common/ParticleBackground'
import AnimatedPage from '../common/AnimatedPage'
import './Layout.css'

export default function Layout() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const { toasts } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDashboard = location.pathname === '/dashboard'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="layout">
      <AmbientBackground />
      <ParticleBackground />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        {!isDashboard && (
          <header className="topbar">
            <div className="topbar-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
                {Menu}
              </button>
              <div className={`connection-dot ${connected ? 'online' : 'offline'}`} />
            </div>
            <div className="topbar-right">
              <div className="topbar-user" onClick={() => navigate('/perfil')}>
                <div className="topbar-avatar">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="topbar-name">{user?.username}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Salir
              </button>
            </div>
          </header>
        )}
        <main className={`content ${isDashboard ? 'fullscreen' : ''}`}>
          <AnimatedPage><Outlet /></AnimatedPage>
        </main>
      </div>
      <SOSButton />
      <Chatbot />
      <BottomNav />
      <Toast toasts={toasts} />
    </div>
  )
}
