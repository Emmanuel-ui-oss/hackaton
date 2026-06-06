import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#e8eaed' }}>Algo salió mal</h1>
          <p style={{ color: '#9aa0a6', maxWidth: 400 }}>{this.state.error.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Recargar página</button>
        </div>
      )
    }
    return this.props.children
  }
}
