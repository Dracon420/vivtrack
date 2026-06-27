import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// When a new deployment changes chunk hashes, the old SW can't fetch them — reload to get fresh.
window.addEventListener('vite:preloadError', () => { window.location.reload() })

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    const { error } = this.state
    if (error) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace', color: '#f87171', background: '#0a0a0a', minHeight: '100vh', wordBreak: 'break-word' }}>
          <h2 style={{ color: '#fca5a5' }}>App Crash</h2>
          <pre style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{(error as Error).message}</pre>
          <pre style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'pre-wrap' }}>{(error as Error).stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
