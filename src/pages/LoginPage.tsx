import { Navigate } from 'react-router-dom'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import '../styles/auth.css'

export function LoginPage() {
  const { busyState, clientReady, envConfigured, errorMessage, login, session } =
    useGoogleWorkspace()

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
      </section>
    </div>
  )
}
