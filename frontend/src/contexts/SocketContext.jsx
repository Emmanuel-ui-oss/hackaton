import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState(null)
  const listeners = useRef(new Map())

  useEffect(() => {
    if (!user) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/stats?token=${localStorage.getItem('token')}`

    const connect = () => {
      ws.current = new WebSocket(url)
      ws.current.onopen = () => setConnected(true)
      ws.current.onclose = () => {
        setConnected(false)
        setTimeout(connect, 3000)
      }
      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'stats') setStats(data.payload)
          listeners.current.forEach((cb, key) => {
            if (data.type === key) cb(data.payload)
          })
        } catch {}
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
