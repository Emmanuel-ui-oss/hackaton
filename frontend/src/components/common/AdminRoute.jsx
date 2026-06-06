import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (!user.is_staff) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
