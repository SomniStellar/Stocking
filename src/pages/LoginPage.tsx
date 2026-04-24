import { Navigate } from 'react-router-dom'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import '../styles/auth.css'

export function LoginPage() {
  const { busyState, clientReady, envConfigured, errorMessage, login, session } =
    useGoogleWorkspace()
  const baseUrl = import.meta.env.BASE_URL
  const privacyUrl = `${baseUrl}privacy.html`
  const supportUrl = `${baseUrl}support.html`

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  const helperMessage = errorMessage
    ?? (!envConfigured ? 'Google sign-in is not available right now.' : null)

  return (
    <div className="auth-shell auth-shell-simple">
      <section className="auth-panel auth-panel-simple">
        <div className="auth-panel-head">
          <p className="eyebrow">Stocking</p>
          <h2>Sign in with Google</h2>
        </div>

        <button
          className="primary-button auth-button"
          onClick={() => {
            void login()
          }}
          disabled={!envConfigured || busyState !== 'idle'}
        >
          {busyState === 'login' ? 'Signing in...' : clientReady ? 'Continue with Google' : 'Preparing sign-in...'}
        </button>

        {helperMessage ? (
          <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
            {helperMessage}
          </div>
        ) : null}

        <p className="auth-meta">
          By continuing, you agree to use your own Google account and spreadsheet.
          {' '}
          <a href={privacyUrl} target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          {' · '}
          <a href={supportUrl} target="_blank" rel="noreferrer">
            Support
          </a>
        </p>
      </section>
    </div>
  )
}
