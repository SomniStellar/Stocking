import { Link } from 'react-router-dom'
import { useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { buildBenchmarkRows, validateBenchmarkRows } from '../data/benchmarkData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import type { BenchmarkDraft } from '../types/domain'

const EMPTY_BENCHMARK_FORM = {
  benchmarkKey: '',
  name: '',
  tickerPrimary: '',
  tickerFallback: '',
}

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
    resetSpreadsheetData,
    saveBenchmarks,
    session,
    snapshot,
    spreadsheet,
    storedSpreadsheetId,
    validationMessage,
  } = useGoogleWorkspace()
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(storedSpreadsheetId)
  const [spreadsheetTitleInput, setSpreadsheetTitleInput] = useState('Stocking Portfolio')
  const [benchmarkForm, setBenchmarkForm] = useState(EMPTY_BENCHMARK_FORM)
  const [editingBenchmarkKey, setEditingBenchmarkKey] = useState<string | null>(null)

  const benchmarkRows = buildBenchmarkRows(snapshot)
  const benchmarkValidation = validateBenchmarkRows(benchmarkRows)
  const benchmarkValidationCaption = benchmarkValidation.duplicateKey
    ? `중복 benchmark key: ${benchmarkValidation.duplicateKey}`
    : benchmarkValidation.duplicateTicker
      ? `중복 티커: ${benchmarkValidation.duplicateTicker}`
      : benchmarkValidation.invalidMarketKey
        ? `미국 외 시장 사용자 지표: ${benchmarkValidation.invalidMarketKey}`
        : benchmarkValidation.customLimitExceeded
          ? '사용자 추가 지표는 최대 3개까지 허용됨'
          : null

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

  function resetBenchmarkForm() {
    setBenchmarkForm(EMPTY_BENCHMARK_FORM)
    setEditingBenchmarkKey(null)
  }

  function toBenchmarkDrafts() {
    return benchmarkRows.map<BenchmarkDraft>((row) => ({
      benchmarkKey: row.benchmarkKey,
      name: row.name,
      tickerPrimary: row.tickerPrimary,
      tickerFallback: row.tickerFallback,
      category: row.category || 'INDEX',
      market: row.market || 'US',
      isDefault: row.isDefault,
      isEnabled: row.isEnabled,
      displayOrder: row.displayOrder,
    }))
  }

  async function persistBenchmarkDrafts(nextDrafts: BenchmarkDraft[]) {
    const orderedDrafts = [...nextDrafts].sort((left, right) => left.displayOrder - right.displayOrder)
    const saved = await saveBenchmarks(orderedDrafts)
    if (saved) {
      resetBenchmarkForm()
    }
  }

  async function handleBenchmarkSubmit() {
    const normalizedKey = benchmarkForm.benchmarkKey.trim().toUpperCase()
    const normalizedTicker = benchmarkForm.tickerPrimary.trim().toUpperCase()
    const normalizedFallback = benchmarkForm.tickerFallback.trim().toUpperCase()
    const normalizedName = benchmarkForm.name.trim() || normalizedKey

    if (!normalizedKey || !normalizedTicker) {
      return
    }

    const currentDrafts = toBenchmarkDrafts()
    const duplicateKey = currentDrafts.find((row) => row.benchmarkKey === normalizedKey && row.benchmarkKey !== editingBenchmarkKey)
    const duplicateTicker = currentDrafts.find((row) => row.tickerPrimary === normalizedTicker && row.benchmarkKey !== editingBenchmarkKey)

    if (duplicateKey || duplicateTicker) {
      return
    }

    const nextCustomCount = editingBenchmarkKey
      ? currentDrafts.filter((row) => !row.isDefault).length
      : currentDrafts.filter((row) => !row.isDefault).length + 1

    if (!editingBenchmarkKey && nextCustomCount > 3) {
      return
    }

    if (editingBenchmarkKey) {
      await persistBenchmarkDrafts(currentDrafts.map((row) => (
        row.benchmarkKey === editingBenchmarkKey
          ? {
              ...row,
              benchmarkKey: normalizedKey,
              name: normalizedName,
              tickerPrimary: normalizedTicker,
              tickerFallback: normalizedFallback,
            }
          : row
      )))
      return
    }

    const nextDisplayOrder = currentDrafts.reduce((maxOrder, row) => Math.max(maxOrder, row.displayOrder), 0) + 1
    await persistBenchmarkDrafts([
      ...currentDrafts,
      {
        benchmarkKey: normalizedKey,
        name: normalizedName,
        tickerPrimary: normalizedTicker,
        tickerFallback: normalizedFallback,
        category: 'INDEX',
        market: 'US',
        isDefault: false,
        isEnabled: true,
        displayOrder: nextDisplayOrder,
      },
    ])
  }

  function handleBenchmarkEdit(benchmarkKey: string) {
    const target = benchmarkRows.find((row) => row.benchmarkKey === benchmarkKey)
    if (!target || target.isDefault) {
      return
    }

    setBenchmarkForm({
      benchmarkKey: target.benchmarkKey,
      name: target.name,
      tickerPrimary: target.tickerPrimary,
      tickerFallback: target.tickerFallback,
    })
    setEditingBenchmarkKey(target.benchmarkKey)
  }

  async function handleBenchmarkToggle(benchmarkKey: string) {
    await persistBenchmarkDrafts(
      toBenchmarkDrafts().map((row) => (
        row.benchmarkKey === benchmarkKey
          ? { ...row, isEnabled: !row.isEnabled }
          : row
      )),
    )
  }

  async function handleBenchmarkDelete(benchmarkKey: string) {
    await persistBenchmarkDrafts(
      toBenchmarkDrafts().filter((row) => row.benchmarkKey !== benchmarkKey),
    )
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

          <p className="muted-copy">Sign in first, then let the app create a Stocking snapshot template spreadsheet automatically.</p>

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
            <button className="primary-button" onClick={() => { void handleSpreadsheetCreate() }} disabled={!session || busyState !== 'idle'}>
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

      <SectionCard title="Benchmark Targets" description="Manage default and custom comparison targets stored in the Benchmarks sheet.">
        <div className="stack-block">
          {benchmarkValidationCaption ? (
            <div className="message-box message-box-neutral">{benchmarkValidationCaption}</div>
          ) : null}

          <div className="benchmark-form-grid">
            <label className="field-block" htmlFor="benchmark-key">
              <span>Benchmark key</span>
              <input
                id="benchmark-key"
                className="text-input"
                value={benchmarkForm.benchmarkKey}
                onChange={(event) => setBenchmarkForm((current) => ({ ...current, benchmarkKey: event.target.value }))}
                placeholder="KOSPI200"
              />
            </label>
            <label className="field-block" htmlFor="benchmark-name">
              <span>Name</span>
              <input
                id="benchmark-name"
                className="text-input"
                value={benchmarkForm.name}
                onChange={(event) => setBenchmarkForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="KOSPI 200"
              />
            </label>
            <label className="field-block" htmlFor="benchmark-primary">
              <span>Primary ticker</span>
              <input
                id="benchmark-primary"
                className="text-input"
                value={benchmarkForm.tickerPrimary}
                onChange={(event) => setBenchmarkForm((current) => ({ ...current, tickerPrimary: event.target.value }))}
                placeholder="SPY"
              />
            </label>
            <label className="field-block" htmlFor="benchmark-fallback">
              <span>Fallback ticker</span>
              <input
                id="benchmark-fallback"
                className="text-input"
                value={benchmarkForm.tickerFallback}
                onChange={(event) => setBenchmarkForm((current) => ({ ...current, tickerFallback: event.target.value }))}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" onClick={() => { void handleBenchmarkSubmit() }} disabled={!spreadsheet || busyState !== 'idle'}>
              {editingBenchmarkKey ? 'Update custom benchmark' : 'Add custom benchmark'}
            </button>
            <button className="secondary-button" onClick={resetBenchmarkForm} disabled={busyState !== 'idle'}>
              Clear form
            </button>
          </div>

          <div className="detail-list benchmark-config-list">
            {benchmarkRows.length === 0 ? (
              <div>
                <span>Status</span>
                <strong>No benchmark rows yet</strong>
              </div>
            ) : (
              benchmarkRows.map((row) => (
                <div key={row.benchmarkKey} className="benchmark-config-card">
                  <div className="section-toolbar">
                    <div>
                      <strong>{row.name || row.benchmarkKey}</strong>
                      <div className="benchmark-config-meta">
                        <span>{row.benchmarkKey}</span>
                        <span>{row.tickerPrimary}</span>
                        <span>{row.tickerFallback || 'No fallback'}</span>
                      </div>
                    </div>
                    <span className={`badge ${row.isEnabled ? 'badge-success' : 'badge-muted'}`}>
                      {row.isDefault ? 'Default' : 'Custom'}
                    </span>
                  </div>

                  <div className="button-row">
                    <button className="secondary-button" onClick={() => { void handleBenchmarkToggle(row.benchmarkKey) }} disabled={!spreadsheet || busyState !== 'idle'}>
                      {row.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    {!row.isDefault ? (
                      <button className="secondary-button" onClick={() => handleBenchmarkEdit(row.benchmarkKey)} disabled={busyState !== 'idle'}>
                        Edit
                      </button>
                    ) : null}
                    {!row.isDefault ? (
                      <button className="secondary-button" onClick={() => { void handleBenchmarkDelete(row.benchmarkKey) }} disabled={!spreadsheet || busyState !== 'idle'}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sheet Data Snapshot" description="Refresh, reset, and inspect the currently loaded Google Sheet rows.">
        <div className="stack-block">
          <div className="button-row">
            <button className="primary-button" onClick={() => { void handleRefresh() }} disabled={!spreadsheet || busyState !== 'idle'}>
              {busyState === 'syncing' ? 'Refreshing data...' : 'Refresh sheet data'}
            </button>
            <button className="secondary-button" onClick={() => { void handleReset() }} disabled={!spreadsheet || busyState !== 'idle'}>
              {busyState === 'writing' ? 'Resetting sheet...' : 'Reset sheet rows'}
            </button>
          </div>

          <div className="message-box message-box-neutral">
            Reset clears Holdings, Watchlists, Monitor, and Benchmarks rows when present, but keeps the sheet, tabs, and headers.
          </div>

          <div className="detail-list">
            <div>
              <span>Holdings rows</span>
              <strong>{snapshot.holdings.length}</strong>
            </div>
            <div>
              <span>Watchlists rows</span>
              <strong>{snapshot.watchlists.length}</strong>
            </div>
            <div>
              <span>Monitor rows</span>
              <strong>{snapshot.monitor.length}</strong>
            </div>
            <div>
              <span>Benchmark rows</span>
              <strong>{snapshot.benchmarks.length}</strong>
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
            <button className="primary-button" onClick={() => { void handleSpreadsheetConnect() }} disabled={!session || busyState !== 'idle'}>
              {busyState === 'spreadsheet' ? 'Checking sheet...' : 'Connect existing sheet'}
            </button>
            <button className="secondary-button" onClick={clearSpreadsheet} disabled={!storedSpreadsheetId && !spreadsheet}>
              Clear saved sheet
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Project Notes" description="Implementation guidance carried from the design docs.">
        <ul className="check-list">
          <li>Holdings support BUY and SELL rows</li>
          <li>Watchlists unify favorites and ideas</li>
          <li>Monitor is auto-synced from current tickers</li>
          <li>Benchmarks sheet stores comparison targets and fallback metadata</li>
          <li>Previous close as the price baseline</li>
          <li>No external market API</li>
        </ul>
      </SectionCard>

      <SectionCard title="Runtime Messages" description="Useful feedback while wiring the real Google integration.">
        <div className="stack-block">
          <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
            {errorMessage ?? 'No runtime errors.'}
          </div>
          <div className="message-box message-box-neutral">Saved spreadsheet ID: {storedSpreadsheetId || 'None'}</div>
        </div>
      </SectionCard>
    </div>
  )
}




