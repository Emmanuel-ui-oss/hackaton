import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import VisionVialLogo from '../components/common/VisionVialLogo'
import './Auth.css'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.email || !form.password) { showError('Usuario, email y contraseña son obligatorios'); return }
    if (form.password.length < 3) { showError('La contraseña debe tener al menos 3 caracteres'); return }
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      showError(err.response?.data?.detail || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <VisionVialLogo className="auth-brand-logo" />
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Únete a VisionVial</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre (opcional)</label>
            <input className="form-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Usuario *</label>
            <input className="form-input" value={form.username} onChange={e => update('username', e.target.value)} placeholder="Nombre de usuario" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña *</label>
            <input className="form-input" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mínimo 3 caracteres" />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>
        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
