import { Link, Navigate } from 'react-router-dom'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function LoginPage() {
  const { busyState, clientReady, envConfigured, errorMessage, login, session } =
    useGoogleWorkspace()

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <p className="eyebrow">Stocking v1</p>
          <h1>US stock monitoring workspace</h1>
          <p className="hero-copy">
            Sign in with Google first, then let the app create a ready-to-use
            spreadsheet template for holdings, favorites, ideas, and monitoring.
          </p>
        </div>

        <div className="auth-feature-list">
          <article className="auth-feature-card">
            <strong>No manual sheet prep</strong>
            <span>Stocking can create the template spreadsheet for you after login.</span>
          </article>
          <article className="auth-feature-card">
            <strong>US stocks only</strong>
            <span>Focused MVP for simpler ticker validation and monitoring.</span>
          </article>
          <article className="auth-feature-card">
            <strong>Previous close pricing</strong>
            <span>No intraday dependency, stable daily portfolio snapshots.</span>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">Phase 1</p>
          <h2>Sign in with Google</h2>
          <p className="muted-copy">
            After sign-in, open Settings and create the Stocking template spreadsheet automatically.
          </p>
        </div>

        <div className="status-panel">
          <span className={`badge ${envConfigured ? 'badge-success' : 'badge-muted'}`}>
            {envConfigured ? 'Client ID ready' : 'Client ID missing'}
          </span>
          <span className={`badge ${clientReady ? 'badge-success' : 'badge-muted'}`}>
            {clientReady ? 'GIS ready' : 'Preparing GIS'}
          </span>
        </div>

        <button
          className="primary-button auth-button"
          onClick={() => {
            void login()
          }}
          disabled={!envConfigured || busyState !== 'idle'}
        >
          {busyState === 'login' ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
          {errorMessage ??
            'Set VITE_GOOGLE_CLIENT_ID in .env.local to test the real login flow.'}
        </div>

        <div className="auth-footer">
          <span>Need the project details first?</span>
          <Link to="/settings" className="inline-link">
            Open connection notes
          </Link>
        </div>
      </section>
    </div>
  )
}
