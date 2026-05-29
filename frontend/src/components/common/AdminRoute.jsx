import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'

export default function AdminRoute() {
  const { user } = useAuth()
  const [isStaff, setIsStaff] = useState(null)

  useEffect(() => {
    if (!user) { setIsStaff(false); return }
    api.get('/api/auth/me').then(r => setIsStaff(r.data.is_staff)).catch(() => setIsStaff(false))
  }, [user])

  if (isStaff === null) return null
  if (!isStaff) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
