import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'

const GREETING = {
  role: 'bot',
  text: '👋 ¡Hola! Pregúntame sobre zonas de riesgo, clima, estadísticas, transporte o rutas seguras.',
}

const btnStyle = {
  position: 'fixed',
  top: 10,
  left: 10,
  zIndex: 99999,
  width: 80,
  height: 40,
  background: '#ff0',
  color: '#000',
  border: '3px solid #f00',
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
}

const boxStyle = {
  position: 'fixed',
  top: 110,
  right: 16,
  zIndex: 99999,
  width: 320,
  maxHeight: 380,
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(18,18,18,0.96)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(42,42,42,0.5)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  overflow: 'hidden',
}

const headStyle = {
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 700,
  color: '#e8eaed',
  borderBottom: '1px solid rgba(42,42,42,0.4)',
  background: 'rgba(41,121,255,0.08)',
}

const bodyStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 260,
}

const bubbleUser = {
  alignSelf: 'flex-end',
  background: '#2979ff',
  color: '#fff',
  borderBottomRightRadius: 2,
  padding: '7px 10px',
  borderRadius: 8,
  fontSize: 11,
  lineHeight: 1.45,
  maxWidth: '90%',
}

const bubbleBot = {
  alignSelf: 'flex-start',
  background: 'rgba(42,42,42,0.6)',
  color: '#e8eaed',
  borderBottomLeftRadius: 2,
  padding: '7px 10px',
  borderRadius: 8,
  fontSize: 11,
  lineHeight: 1.45,
  maxWidth: '90%',
}

const footStyle = {
  display: 'flex',
  gap: 6,
  padding: '8px 10px',
  borderTop: '1px solid rgba(42,42,42,0.4)',
}

const inputStyle = {
  flex: 1,
  background: 'rgba(42,42,42,0.4)',
  border: '1px solid rgba(42,42,42,0.3)',
  borderRadius: 5,
  padding: '7px 10px',
  fontSize: 11,
  color: '#e8eaed',
  outline: 'none',
}

const goStyle = {
  width: 30,
  height: 30,
  background: '#2979ff',
  border: 'none',
  borderRadius: 5,
  fontSize: 12,
  cursor: 'pointer',
  color: '#fff',
  flexShrink: 0,
}

export default function Chatbot() {
  console.log('[Chatbot] RENDERED')
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
    <div id="chatbot-root">
      <button id="chatbot-btn" style={btnStyle} onClick={() => setOpen(p => !p)}>
        {open ? '✕' : 'CHAT'}
      </button>
      {open && (
        <div style={boxStyle}>
          <div style={headStyle}>💬 Asistente Movilidad</div>
          <div style={bodyStyle} ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? bubbleUser : bubbleBot}>
                {m.text.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}
              </div>
            ))}
            {loading && <div style={bubbleBot}>...</div>}
          </div>
          <div style={footStyle}>
            <input style={inputStyle} placeholder="Escribe un mensaje..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} />
            <button style={{...goStyle, opacity: loading || !input.trim() ? 0.4 : 1}}
              onClick={send} disabled={loading || !input.trim()}>➤</button>
          </div>
        </div>
      )}
    </div>
  )
}
