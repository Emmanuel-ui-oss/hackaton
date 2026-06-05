import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'
import { MessageCircle, Close, ArrowRight } from '../../icons'
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
      <button className={`chat-toggle ${open ? 'chat-open' : ''}`} onClick={() => setOpen(p => !p)}>
        {open ? <span className="chat-toggle-icon">{Close}</span> : <span className="chat-toggle-icon">{MessageCircle}</span>}
      </button>
      {open && (
        <div className="chat-box">
          <div className="chat-header"><span className="chat-header-icon">{MessageCircle}</span> Asistente Movilidad</div>
          <div className="chat-body" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-${m.role}`}>
                {m.text.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}
              </div>
            ))}
            {loading && <div className="chat-bubble chat-bot chat-loading">...</div>}
          </div>
          <div className="chat-footer">
            <input className="chat-input" placeholder="Escribe un mensaje..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} />
            <button className={`chat-send ${(!loading && input.trim()) ? 'chat-send-active' : ''}`}
              onClick={send} disabled={loading || !input.trim()}>{ArrowRight}</button>
          </div>
        </div>
      )}
    </>
  )
}
