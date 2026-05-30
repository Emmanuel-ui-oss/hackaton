import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'
import './Chatbot.css'

const GREETING = {
  role: 'bot',
  text: '👋 ¡Hola! Pregúntame sobre zonas de riesgo, clima, estadísticas, transporte o rutas seguras.',
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await api.post('/api/v1/chat', { message: text })
      setMessages(m => [...m, { role: 'bot', text: res.data.reply }])
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'Error de conexión. Intenta de nuevo.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <button className="cb-btn" onClick={() => setOpen(p => !p)}>
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="cb-box">
          <div className="cb-head">💬 Asistente Movilidad</div>
          <div className="cb-body" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`cb-bubble ${m.role}`}>
                {m.text.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}
              </div>
            ))}
            {loading && <div className="cb-bubble bot">...</div>}
          </div>
          <div className="cb-foot">
            <input className="cb-inp" placeholder="Escribe un mensaje..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} />
            <button className="cb-go" onClick={send} disabled={loading || !input.trim()}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
