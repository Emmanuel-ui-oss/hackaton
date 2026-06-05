import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Lock } from '../../icons'
import './LoginDropdown.css'

export default function LoginDropdown({ trigger, onTriggerDone }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login')

  useEffect(() => {
    if (trigger?.open) {
      setOpen(true)
      setMode(trigger.mode || 'login')
      onTriggerDone?.()
    }
  }, [trigger])
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()
  const ref = useRef(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [reg, setReg] = useState({ username: '', email: '', password: '', first_name: '' })

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const reset = () => {
    setUsername(''); setPassword(''); setReg({ username: '', email: '', password: '', first_name: '' })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) { showError('Todos los campos son obligatorios'); return }
    setLoading(true)
    try {
      await login(username, password)
      setOpen(false); reset()
      navigate('/dashboard')
    } catch (err) {
      showError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!reg.username || !reg.email || !reg.password) { showError('Usuario, email y contraseña son obligatorios'); return }
    if (reg.password.length < 3) { showError('La contraseña debe tener al menos 3 caracteres'); return }
    setLoading(true)
    try {
      await register(reg)
      setOpen(false); reset()
      navigate('/dashboard')
    } catch (err) {
      showError(err.response?.data?.detail || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => {
    setMode(m)
    reset()
  }

  return (
    <div className="login-dropdown" ref={ref}>
      <button className="btn btn-primary btn-sm" onClick={() => { setOpen(!open); reset() }}>
        Iniciar Sesión
      </button>
      {open && (
        <div className="login-dropdown-menu">
          <div className="login-dropdown-tabs">
            <button className={`login-dropdown-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>Iniciar Sesión</button>
            <button className={`login-dropdown-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>Registrarse</button>
          </div>

          <div className={`login-dropdown-body ${mode}`}>
            {mode === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Usuario</label>
                    <div className="input-icon-wrap">
                    <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>
                    <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuario" autoFocus />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                    <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm btn-submit" type="submit" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Nombre (opcional)</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>
                    <input className="form-input" value={reg.first_name} onChange={e => setReg(p => ({ ...p, first_name: e.target.value }))} placeholder="Tu nombre" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Usuario <span className="required">*</span></label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>
                    <input className="form-input" value={reg.username} onChange={e => setReg(p => ({ ...p, username: e.target.value }))} placeholder="Nombre de usuario" autoFocus />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="required">*</span></label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg></span>
                    <input className="form-input" type="email" value={reg.email} onChange={e => setReg(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña <span className="required">*</span></label>
                  <div className="input-icon-wrap">
                    <span className="input-icon">{Lock}</span>
                    <input className="form-input" type="password" value={reg.password} onChange={e => setReg(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 3 caracteres" />
                  </div>
                  <span className="form-hint">Mínimo 3 caracteres</span>
                </div>
                <button className="btn btn-gradient btn-sm btn-submit" type="submit" disabled={loading}>
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </form>
            )}
          </div>

          {mode === 'login' && (
            <div className="login-dropdown-demo">
              <span>Demo: <strong>demo</strong> / <strong>demo123</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
