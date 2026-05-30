import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'
import './Chatbot.css'

const WELCOME = {
  role: 'bot',
  text: '👋 ¡Hola! Soy tu asistente de movilidad de Medellín.\n\nPuedes preguntarme:\n• ⚠️ "¿Cuántas zonas críticas hay?"\n• 🌤️ "¿Cómo está el clima?"\n• 📊 "¿Cuántos reportes hay?"\n• 🚇 "¿Qué líneas de metro hay?"\n• 🗺️ "¿Ruta segura al centro?"',
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await api.post('/api/v1/chat', { message: text })
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: '❌ Error al conectar con el servidor. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') send()
  }

  return (
    <>
      <button className={`cb-fab ${open ? 'cb-fab-open' : ''}`} onClick={() => setOpen(p => !p)} title="Chatbot">
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="cb-panel">
          <div className="cb-header">
            <span>💬 Asistente Movilidad</span>
          </div>
          <div className="cb-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`cb-msg cb-msg-${m.role}`}>
                {m.text.split('\n').map((line, j) => (
                  <span key={j}>{line}<br /></span>
                ))}
              </div>
            ))}
            {loading && <div className="cb-msg cb-msg-bot"><span className="cb-typing">...</span></div>}
          </div>
          <div className="cb-input-area">
            <input className="cb-input" placeholder="Escribe un mensaje..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={handleKey} disabled={loading} />
            <button className="cb-send" onClick={send} disabled={loading || !input.trim()}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
