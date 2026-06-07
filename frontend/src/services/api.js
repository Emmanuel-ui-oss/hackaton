import axios from 'axios'

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let pendingQueue = []

function getAccessToken() {
  return sessionStorage.getItem('access_token')
}

function getRefreshToken() {
  return sessionStorage.getItem('refresh_token')
}

function setTokens(access, refresh) {
  sessionStorage.setItem('access_token', access)
  if (refresh) sessionStorage.setItem('refresh_token', refresh)
}

function clearTokens() {
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('user')
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (!err.response && !original._retryNetwork) {
      original._retryNetwork = true
      await new Promise(r => setTimeout(r, 1500))
      return api(original)
    }
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err)
    const authEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']
    if (authEndpoints.some(url => original.url.includes(url))) return Promise.reject(err)
    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`
          resolve(api(original))
        })
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token')
      const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
      const { access_token, refresh_token } = res.data
      setTokens(access_token, refresh_token)
      pendingQueue.forEach(cb => cb(access_token))
      pendingQueue = []
      original.headers.Authorization = `Bearer ${access_token}`
      return api(original)
    } catch {
      clearTokens()
      window.location.href = '/'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
export { getAccessToken, getRefreshToken, setTokens, clearTokens }
