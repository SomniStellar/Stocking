import { Link } from 'react-router-dom'
import { useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function SettingsPage() {
  const {
    busyState,
    clearSpreadsheet,
    clientReady,
    connectSpreadsheet,
    envConfigured,
    errorMessage,
    logout,
    session,
    spreadsheet,
    storedSpreadsheetId,
    validationMessage,
  } = useGoogleWorkspace()
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(storedSpreadsheetId)

  async function handleSpreadsheetConnect() {
    await connectSpreadsheet(spreadsheetIdInput)
  }

  return (
    <div className="page-stack settings-grid settings-grid-expanded">
      <SectionCard
        title="Connected Account"
        description="Google authentication state for the current workspace."
      >
        <div className="stack-block">
          <div className="status-panel">
            <span className={`badge ${envConfigured ? 'badge-success' : 'badge-muted'}`}>
              {envConfigured ? 'Client ID ready' : 'Client ID missing'}
            </span>
            <span className={`badge ${clientReady ? 'badge-success' : 'badge-muted'}`}>
              {clientReady ? 'GIS script ready' : 'Preparing GIS'}
            </span>
          </div>

          <p className="muted-copy">
            Use the login page as the first step. Once authenticated, manage the
            spreadsheet connection here.
          </p>

          <div className="button-row">
            <Link className="primary-button button-link" to="/login">
              Open login page
            </Link>
            <button
              className="secondary-button"
              onClick={logout}
              disabled={!session}
            >
              Sign out
            </button>
          </div>

          <div className="detail-list">
            <div>
              <span>Status</span>
              <strong>{session ? 'Authenticated' : 'Signed out'}</strong>
            </div>
            <div>
              <span>User</span>
              <strong>{session ? session.profile.email : 'Not available'}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Spreadsheet Connection"
        description="Bind an existing Google Spreadsheet and validate the v1 template tabs."
      >
        <div className="stack-block">
          <label className="field-block" htmlFor="spreadsheet-id">
            <span>Spreadsheet ID</span>
            <input
              id="spreadsheet-id"
              className="text-input"
              value={spreadsheetIdInput}
              onChange={(event) => setSpreadsheetIdInput(event.target.value)}
              placeholder="1AbCDEF..."
            />
          </label>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => {
                void handleSpreadsheetConnect()
              }}
              disabled={!session || busyState !== 'idle'}
            >
              {busyState === 'spreadsheet'
                ? 'Checking sheet...'
                : 'Connect spreadsheet'}
            </button>
            <button
              className="secondary-button"
              onClick={clearSpreadsheet}
              disabled={!storedSpreadsheetId && !spreadsheet}
            >
              Clear saved sheet
            </button>
          </div>

          <div className="detail-list">
            <div>
              <span>Connected title</span>
              <strong>{spreadsheet ? spreadsheet.title : 'Not connected'}</strong>
            </div>
            <div>
              <span>Sheet tabs</span>
              <strong>
                {spreadsheet
                  ? spreadsheet.sheets.join(', ')
                  : 'No metadata loaded'}
              </strong>
            </div>
            <div>
              <span>Template check</span>
              <strong>{validationMessage ?? 'Not validated yet'}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Project Notes"
        description="Implementation guidance carried from the design docs."
      >
        <ul className="check-list">
          <li>Phase 1 focuses on title page, login, and existing sheet connection</li>
          <li>US stocks only</li>
          <li>Previous close as the price baseline</li>
          <li>No external market API</li>
          <li>Dividend features deferred</li>
        </ul>
      </SectionCard>

      <SectionCard
        title="Runtime Messages"
        description="Useful feedback while wiring the real Google integration."
      >
        <div className="stack-block">
          <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
            {errorMessage ?? 'No runtime errors.'}
          </div>
          <div className="message-box message-box-neutral">
            Saved spreadsheet ID: {storedSpreadsheetId || 'None'}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
