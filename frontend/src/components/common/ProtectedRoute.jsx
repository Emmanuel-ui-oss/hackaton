import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Loading from './Loading'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading text="Verificando sesión..." />
  if (!user) return <Navigate to="/" replace />
  return children || <Outlet />
}
