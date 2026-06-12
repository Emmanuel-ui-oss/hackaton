import axios from 'axios'
import { GoogleGenerativeAI } from "@google/generative-ai"

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

const genai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genai.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `Eres un asistente de movilidad urbana.
    Responde solo sobre: zonas de riesgo, clima, estadísticas de tráfico,
    transporte público y rutas seguras.
    Sé conciso y usa viñetas cuando listes información.`,
})

const chat = model.startChat({ history: [] })

// Reemplaza la función askGemini en api.js
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro-002"]

async function askOllama(userMessage, history = []) {
  const messages = [
    {
      role: "system",
      content: `Eres un asistente de movilidad urbana.
        Responde solo sobre: zonas de riesgo, clima, estadísticas de tráfico,
        transporte público y rutas seguras.
        Sé conciso y usa viñetas cuando listes información.`,
    },
    ...history,
    { role: "user", content: userMessage },
  ]

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-coder:7b",  // ← aquí el cambio
      messages,
      stream: false,
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.message.content
}

export default api
export { askOllama, getAccessToken, getRefreshToken, setTokens, clearTokens }
