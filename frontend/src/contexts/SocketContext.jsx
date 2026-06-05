import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { getAccessToken } from '../services/api'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState(null)
  const listeners = useRef(new Map())
  const authed = useRef(false)

  useEffect(() => {
    if (!user) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/stats`

    const connect = () => {
      authed.current = false
      ws.current = new WebSocket(url)
      ws.current.onopen = () => {
        const token = getAccessToken()
        if (token) {
          ws.current.send(JSON.stringify({ type: 'auth', token }))
        }
      }
      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (!authed.current && data.type === 'auth_ok') {
            authed.current = true
            setConnected(true)
            return
          }
          if (data.type === 'stats') setStats(data.payload)
          listeners.current.forEach((cb, key) => {
            if (data.type === key) cb(data.payload)
          })
        } catch {}
      }
      ws.current.onclose = () => {
        setConnected(false)
        setTimeout(connect, 3000)
      }
    }
    connect()
    return () => ws.current?.close()
  }, [user])

  const subscribe = (event, callback) => {
    listeners.current.set(event, callback)
    return () => listeners.current.delete(event)
  }

  return (
    <SocketContext.Provider value={{ connected, stats, subscribe }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
