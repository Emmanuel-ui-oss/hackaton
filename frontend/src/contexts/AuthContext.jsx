import { createContext, useContext, useState, useEffect } from 'react'
import api, { setTokens, getAccessToken, clearTokens } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('user')
    if (getAccessToken() && saved) {
      setUser(JSON.parse(saved))
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    const me = await api.get('/api/auth/me')
    sessionStorage.setItem('user', JSON.stringify(me.data))
    setUser(me.data)
  }

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password })
    const { access_token, refresh_token } = res.data
    setTokens(access_token, refresh_token)
    await fetchUser()
    return res.data
  }

  const register = async (data) => {
    const res = await api.post('/api/auth/register', data)
    const { access_token, refresh_token } = res.data
    setTokens(access_token, refresh_token)
    await fetchUser()
    return res.data
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
