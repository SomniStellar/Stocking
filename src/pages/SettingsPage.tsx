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
    createTemplateSpreadsheet,
    envConfigured,
    errorMessage,
    logout,
    refreshSpreadsheetData,
    session,
    snapshot,
    spreadsheet,
    storedSpreadsheetId,
    validationMessage,
  } = useGoogleWorkspace()
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(storedSpreadsheetId)
  const [spreadsheetTitleInput, setSpreadsheetTitleInput] = useState('Stocking Portfolio')

  async function handleSpreadsheetConnect() {
    await connectSpreadsheet(spreadsheetIdInput)
  }

  async function handleSpreadsheetCreate() {
    await createTemplateSpreadsheet(spreadsheetTitleInput)
  }

  async function handleRefresh() {
    await refreshSpreadsheetData()
  }

  return (
    <div className="page-stack settings-grid settings-grid-expanded">
      <SectionCard title="Connected Account" description="Google authentication state for the current workspace.">
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
            Sign in first, then let the app create a Stocking template spreadsheet automatically.
          </p>

          <div className="button-row">
            <Link className="primary-button button-link" to="/login">
              Open login page
            </Link>
            <button className="secondary-button" onClick={logout} disabled={!session}>
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

      <SectionCard title="Create Template Spreadsheet" description="Generate a ready-to-use Google Spreadsheet with the required Stocking tabs and headers.">
        <div className="stack-block">
          <label className="field-block" htmlFor="spreadsheet-title">
            <span>Spreadsheet title</span>
            <input
              id="spreadsheet-title"
              className="text-input"
              value={spreadsheetTitleInput}
              onChange={(event) => setSpreadsheetTitleInput(event.target.value)}
              placeholder="Stocking Portfolio"
            />
          </label>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => {
                void handleSpreadsheetCreate()
              }}
              disabled={!session || busyState !== 'idle'}
            >
              {busyState === 'creating' ? 'Creating template...' : 'Create template spreadsheet'}
            </button>
            {spreadsheet ? (
              <a className="secondary-button button-link" href={spreadsheet.url} target="_blank" rel="noreferrer">
                Open sheet
              </a>
            ) : null}
          </div>

          <div className="detail-list">
            <div>
              <span>Connected title</span>
              <strong>{spreadsheet ? spreadsheet.title : 'Not connected'}</strong>
            </div>
            <div>
              <span>Sheet URL</span>
              <strong>{spreadsheet ? spreadsheet.url : 'No sheet yet'}</strong>
            </div>
            <div>
              <span>Template check</span>
              <strong>{validationMessage ?? 'Template not created yet'}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sheet Data Snapshot" description="Refresh and inspect the currently loaded Google Sheet rows.">
        <div className="stack-block">
          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => {
                void handleRefresh()
              }}
              disabled={!spreadsheet || busyState !== 'idle'}
            >
              {busyState === 'syncing' ? 'Refreshing data...' : 'Refresh sheet data'}
            </button>
          </div>

          <div className="detail-list">
            <div>
              <span>Stocks rows</span>
              <strong>{snapshot.stocks.length}</strong>
            </div>
            <div>
              <span>Holdings rows</span>
              <strong>{snapshot.holdings.length}</strong>
            </div>
            <div>
              <span>Favorites rows</span>
              <strong>{snapshot.favorites.length}</strong>
            </div>
            <div>
              <span>Ideas rows</span>
              <strong>{snapshot.ideas.length}</strong>
            </div>
            <div>
              <span>Monitor rows</span>
              <strong>{snapshot.monitor.length}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Advanced: Connect Existing Spreadsheet" description="Optional path if you later decide to bind an already-created Google Spreadsheet.">
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
              {busyState === 'spreadsheet' ? 'Checking sheet...' : 'Connect existing sheet'}
            </button>
            <button className="secondary-button" onClick={clearSpreadsheet} disabled={!storedSpreadsheetId && !spreadsheet}>
              Clear saved sheet
            </button>
          </div>

          <p className="muted-copy">
            This is optional. The recommended flow is to let Stocking create the template for you.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Project Notes" description="Implementation guidance carried from the design docs.">
        <ul className="check-list">
          <li>Phase 1 now centers on login, template sheet creation, and live sheet reads</li>
          <li>US stocks only</li>
          <li>Previous close as the price baseline</li>
          <li>No external market API</li>
          <li>Dividend features deferred</li>
        </ul>
      </SectionCard>

      <SectionCard title="Runtime Messages" description="Useful feedback while wiring the real Google integration.">
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
