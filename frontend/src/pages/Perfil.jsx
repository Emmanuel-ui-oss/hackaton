import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { UserCircle } from '../icons'

export default function Perfil() {
  const { user, logout } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
    success('Sesión cerrada')
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{UserCircle} Mi Perfil</h1>
        <p className="page-subtitle">Información de tu cuenta</p>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--green))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', color: '#fff', fontWeight: 800,
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{user?.username}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" value={`${user?.first_name || ''} ${user?.last_name || ''}`} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input className="form-input" value={user?.username || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
        </div>

        <button className="btn btn-danger" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
