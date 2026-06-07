import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { getAccessToken } from '../services/api'

const SocketContext = createContext()
const MAX_RECONNECT = 10
const HEARTBEAT_MS = 30000

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState(null)
  const listeners = useRef(new Map())
  const authed = useRef(false)
  const reconnectCount = useRef(0)
  const reconnectTimer = useRef(null)
  const heartbeatTimer = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!user) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/stats`

    const clearTimers = () => {
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null }
      if (heartbeatTimer.current) { clearInterval(heartbeatTimer.current); heartbeatTimer.current = null }
    }

    const connect = () => {
      if (!mounted.current) return
      if (reconnectCount.current >= MAX_RECONNECT) return
      authed.current = false

      if (ws.current) {
        ws.current.onclose = null
        ws.current.onerror = null
        ws.current.onmessage = null
        ws.current.close()
      }

      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        reconnectCount.current = 0
        const token = getAccessToken()
        if (token) ws.current.send(JSON.stringify({ type: 'auth', token }))

        heartbeatTimer.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_MS)
      }

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (!authed.current && data.type === 'auth_ok') {
            authed.current = true
            setConnected(true)
            return
          }
          if (data.type === 'pong') return
          if (data.type === 'stats') setStats(data.payload)
          listeners.current.forEach((cb, key) => {
            if (data.type === key) cb(data.payload)
          })
        } catch {}
      }

      ws.current.onclose = () => {
        clearTimers()
        setConnected(false)
        if (!mounted.current) return
        reconnectCount.current++
        if (reconnectCount.current <= MAX_RECONNECT) {
          const delay = Math.min(1000 * Math.pow(2, reconnectCount.current - 1) + Math.random() * 500, 30000)
          reconnectTimer.current = setTimeout(connect, delay)
        }
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    }

    connect()

    return () => {
      clearTimers()
      if (ws.current) {
        ws.current.onclose = null
        ws.current.onerror = null
        ws.current.close()
        ws.current = null
      }
    }
  }, [user])

  const subscribe = (event, callback) => {
    listeners.current.set(event, callback)
    return () => { listeners.current.delete(event) }
  }

  return (
    <SocketContext.Provider value={{ connected, stats, subscribe }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
