import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '../components/SectionCard'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import '../styles/settings.css'

export function SettingsPage() {
  const {
    busyState,
    clearSpreadsheet,
    connectSpreadsheet,
    createTemplateSpreadsheet,
    errorMessage,
    logout,
    refreshSpreadsheetData,
    resetSpreadsheetData,
    session,
    spreadsheet,
    storedSpreadsheetId,
  } = useGoogleWorkspace()
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(storedSpreadsheetId)
  const [spreadsheetTitleInput, setSpreadsheetTitleInput] = useState('Stocking Portfolio')

  useEffect(() => {
    setSpreadsheetIdInput(storedSpreadsheetId)
  }, [storedSpreadsheetId])

  async function handleSpreadsheetConnect() {
    await connectSpreadsheet(spreadsheetIdInput)
  }

  async function handleSpreadsheetCreate() {
    await createTemplateSpreadsheet(spreadsheetTitleInput)
  }

  async function handleRefresh() {
    await refreshSpreadsheetData()
  }

  async function handleReset() {
    await resetSpreadsheetData()
  }

  return (
    <div className="page-stack settings-stack">
      <SectionCard title="Account">
        <div className="stack-block">
          <div className="detail-list">
            <div>
              <span>Status</span>
              <strong>{session ? 'Signed in' : 'Signed out'}</strong>
            </div>
            <div>
              <span>User</span>
              <strong>{session ? session.profile.email : 'Not connected'}</strong>
            </div>
          </div>

          <div className="button-row">
            {session ? (
              <button className="secondary-button" onClick={logout}>
                Sign out
              </button>
            ) : (
              <Link className="primary-button button-link" to="/login">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Spreadsheet">
        <div className="stack-block settings-panel-stack">
          <div className="detail-list">
            <div>
              <span>Connected sheet</span>
              <strong>{spreadsheet ? spreadsheet.title : 'Not connected'}</strong>
            </div>
          </div>

          <div className="settings-form-stack">
            <div className="settings-form-block">
              <label className="field-block" htmlFor="spreadsheet-title">
                <span>New sheet name</span>
                <input
                  id="spreadsheet-title"
                  className="text-input"
                  value={spreadsheetTitleInput}
                  onChange={(event) => setSpreadsheetTitleInput(event.target.value)}
                  placeholder="Stocking Portfolio"
                />
              </label>

              <button className="primary-button settings-inline-button" onClick={() => { void handleSpreadsheetCreate() }} disabled={!session || busyState !== 'idle'}>
                {busyState === 'creating' ? 'Creating...' : 'Create new sheet'}
              </button>
            </div>

            <div className="settings-form-block">
              <label className="field-block" htmlFor="spreadsheet-id">
                <span>Existing sheet ID</span>
                <input
                  id="spreadsheet-id"
                  className="text-input"
                  value={spreadsheetIdInput}
                  onChange={(event) => setSpreadsheetIdInput(event.target.value)}
                  placeholder="1AbCDEF..."
                />
              </label>

              <button className="secondary-button settings-inline-button" onClick={() => { void handleSpreadsheetConnect() }} disabled={!session || busyState !== 'idle'}>
                {busyState === 'spreadsheet' ? 'Connecting...' : 'Connect existing'}
              </button>
            </div>
          </div>

          <div className="settings-action-grid settings-action-grid-compact">
            <div className="settings-button-row">
              <button className="secondary-button settings-inline-button" onClick={() => { void handleRefresh() }} disabled={!spreadsheet || busyState !== 'idle'}>
                {busyState === 'syncing' ? 'Syncing...' : 'Sync latest data'}
              </button>
            </div>

            <div className="settings-button-row">
              <button className="secondary-button settings-inline-button" onClick={() => { void handleReset() }} disabled={!spreadsheet || busyState !== 'idle'}>
                {busyState === 'writing' ? 'Rebuilding...' : 'Rebuild sheet data'}
              </button>
            </div>

            <div className="settings-button-row">
              {spreadsheet ? (
                <a className="secondary-button button-link settings-inline-button" href={spreadsheet.url} target="_blank" rel="noreferrer">
                  Open sheet
                </a>
              ) : (
                <button className="secondary-button settings-inline-button" disabled>
                  Open sheet
                </button>
              )}
            </div>

            <div className="settings-button-row">
              <button className="secondary-button settings-inline-button" onClick={clearSpreadsheet} disabled={!storedSpreadsheetId && !spreadsheet}>
                Disconnect sheet
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {errorMessage ? (
        <SectionCard title="Message">
          <div className="stack-block">
            <div className="message-box message-box-error">{errorMessage}</div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}
