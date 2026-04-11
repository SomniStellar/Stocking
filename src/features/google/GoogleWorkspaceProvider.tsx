import { type PropsWithChildren, useEffect, useState } from 'react'
import type { BenchmarkDraft, HoldingDraft, WatchlistDraft } from '../../types/domain'
import { loadGoogleIdentityScript, requestGoogleAccessToken } from '../../lib/google/googleIdentity'
import {
  appendHoldingRow,
  appendWatchlistRow,
  createTemplateSpreadsheet,
  deleteSheetRows,
  fetchGoogleUserProfile,
  fetchSpreadsheetConnection,
  fetchSpreadsheetSnapshot,
  getTemplateValidationMessage,
  overwriteBenchmarkRows,
  overwriteHoldingRows,
  resetSpreadsheetRows,
  rewriteTemplateHeaders,
  syncMonitorSheet,
} from '../../lib/google/googleSheets'
import type { GoogleSession } from '../../types/google'
import type { SpreadsheetSnapshot } from '../../types/sheets'
import {
  GoogleWorkspaceContext,
  type GoogleWorkspaceContextValue,
} from './GoogleWorkspaceContext'

const STORAGE_KEY = 'stocking.spreadsheetId'

const EMPTY_SNAPSHOT: SpreadsheetSnapshot = {
  holdings: [],
  watchlists: [],
  monitor: [],
  benchmarks: [],
  seriesCalendar: [],
  series: [],
}

const PREVIEW_HOLDINGS_SNAPSHOT: SpreadsheetSnapshot = {
  holdings: [
    { row_number: 2, ticker: 'AAPL', name: 'Apple', side: 'BUY', quantity: 12, avg_price: 186.25, tags: 'core, tech', display_order: 1 },
    { row_number: 3, ticker: 'MSFT', name: 'Microsoft', side: 'BUY', quantity: 8, avg_price: 412.1, tags: 'core, ai', display_order: 2 },
    { row_number: 4, ticker: 'TSLA', name: 'Tesla', side: 'BUY', quantity: 5, avg_price: 224.6, tags: 'growth', display_order: 3 },
    { row_number: 5, ticker: 'NVDA', name: 'NVIDIA', side: 'BUY', quantity: 6, avg_price: 781.45, tags: 'ai, semis', display_order: 4 },
  ],
  watchlists: [],
  monitor: [
    { ticker: 'SPY', full_ticker: 'NYSEARCA:SPY', closeyest: 579.12, ytd_price: 548.05, price_1y: 517.44, price_3y: 412.88, price_5y: 322.11, tradetime: '2026-04-10 09:00' },
    { ticker: 'QQQ', full_ticker: 'NASDAQ:QQQ', closeyest: 512.44, ytd_price: 471.02, price_1y: 438.61, price_3y: 339.72, price_5y: 258.47, tradetime: '2026-04-10 09:00' },
    { ticker: 'DIA', full_ticker: 'NYSEARCA:DIA', closeyest: 438.17, ytd_price: 421.5, price_1y: 397.85, price_3y: 342.66, price_5y: 286.3, tradetime: '2026-04-10 09:00' },
    { ticker: 'AAPL', full_ticker: 'NASDAQ:AAPL', closeyest: 211.42, ytd_price: 192.33, price_1y: 182.14, price_3y: 148.72, price_5y: 122.5, tradetime: '2026-04-10 09:00' },
    { ticker: 'MSFT', full_ticker: 'NASDAQ:MSFT', closeyest: 468.55, ytd_price: 438.21, price_1y: 405.33, price_3y: 312.44, price_5y: 246.11, tradetime: '2026-04-10 09:00' },
    { ticker: 'TSLA', full_ticker: 'NASDAQ:TSLA', closeyest: 201.18, ytd_price: 228.4, price_1y: 172.44, price_3y: 179.22, price_5y: 151.85, tradetime: '2026-04-10 09:00' },
    { ticker: 'NVDA', full_ticker: 'NASDAQ:NVDA', closeyest: 924.36, ytd_price: 801.2, price_1y: 745.22, price_3y: 461.15, price_5y: 217.7, tradetime: '2026-04-10 09:00' },
  ],
  benchmarks: [
    { benchmark_key: 'SP500', ticker_primary: 'SPY', ticker_fallback: '', resolved_ticker: 'SPY', resolved_source: 'primary', status: 'ready', market: 'US', name: 'S&P 500', category: 'INDEX', is_default: true, is_enabled: true, display_order: 1, retry_count: 0 },
    { benchmark_key: 'NASDAQ100', ticker_primary: 'QQQ', ticker_fallback: '', resolved_ticker: 'QQQ', resolved_source: 'primary', status: 'ready', market: 'US', name: 'Nasdaq 100', category: 'INDEX', is_default: true, is_enabled: true, display_order: 2, retry_count: 0 },
    { benchmark_key: 'DOW', ticker_primary: 'DIA', ticker_fallback: '', resolved_ticker: 'DIA', resolved_source: 'primary', status: 'ready', market: 'US', name: 'Dow Jones', category: 'INDEX', is_default: true, is_enabled: true, display_order: 3, retry_count: 0 },
  ],
  seriesCalendar: [],
  series: [],
}

const PREVIEW_SPREADSHEET = {
  id: 'dev-preview-workspace',
  title: '[Dev/Test] Workspace Preview',
  url: 'https://example.invalid/dev-preview-workspace',
  sheets: ['Holdings', 'Watchlists', 'Monitor', 'Benchmarks'],
  sheetIds: { Holdings: 0, Watchlists: 1, Monitor: 2, Benchmarks: 3 },
  isTemplateValid: true,
  checkedAt: new Date('2026-04-10T00:00:00.000Z').toISOString(),
} satisfies GoogleWorkspaceContextValue['spreadsheet']

function collectMonitorTickers(snapshot: SpreadsheetSnapshot) {
  return [...new Set([
    ...snapshot.holdings.map((row) => row.ticker),
    ...snapshot.watchlists.map((row) => row.ticker),
    ...snapshot.benchmarks.filter((row) => row.is_enabled).map((row) => row.resolved_ticker || row.ticker_primary),
  ].map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))]
}

export function GoogleWorkspaceProvider({ children }: PropsWithChildren) {
  const [clientReady, setClientReady] = useState(false)
  const [session, setSession] = useState<GoogleSession | null>(null)
  const [spreadsheet, setSpreadsheet] = useState<GoogleWorkspaceContextValue['spreadsheet']>(null)
  const [snapshot, setSnapshot] = useState<SpreadsheetSnapshot>(EMPTY_SNAPSHOT)
  const [storedSpreadsheetId, setStoredSpreadsheetId] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [busyState, setBusyState] = useState<'idle' | 'login' | 'spreadsheet' | 'creating' | 'syncing' | 'writing'>('idle')

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  const envConfigured = clientId.length > 0

  useEffect(() => {
    const savedSpreadsheetId = window.localStorage.getItem(STORAGE_KEY) ?? ''
    setStoredSpreadsheetId(savedSpreadsheetId)
  }, [])

  useEffect(() => {
    const previewMode = new URLSearchParams(window.location.search).get('preview')
    const isLocalPreviewHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    const isPreviewWorkspace = isLocalPreviewHost && (previewMode === 'holdings' || previewMode === 'dashboard' || previewMode === 'settings' || previewMode === 'watchlists')

    if (!isPreviewWorkspace) {
      return
    }

    setSession({
      accessToken: 'dev-preview-token',
      profile: {
        email: 'preview@stocking.local',
        name: '[Dev/Test] Workspace Preview',
      },
    })
    setSpreadsheet(PREVIEW_SPREADSHEET)
    setSnapshot(PREVIEW_HOLDINGS_SNAPSHOT)
    setStoredSpreadsheetId('')
    setValidationMessage('[Dev/Test] Preview data is active.')
    setErrorMessage('[Dev/Test] Preview mode bypasses live Google Sheets and renders sample data for layout review.')
    setClientReady(true)
  }, [])

  useEffect(() => {
    if (!envConfigured) {
      return
    }

    loadGoogleIdentityScript()
      .then(() => setClientReady(true))
      .catch((error: Error) => {
        setClientReady(false)
        setErrorMessage(error.message)
      })
  }, [envConfigured])

  useEffect(() => {
    if (!session?.accessToken || !storedSpreadsheetId || busyState !== 'idle') {
      return
    }

    if (spreadsheet?.id === storedSpreadsheetId) {
      return
    }

    void (async () => {
      setBusyState('spreadsheet')
      setErrorMessage(null)

      try {
        await hydrateSpreadsheet(storedSpreadsheetId, session.accessToken, { syncMonitor: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reconnect saved spreadsheet.'
        setErrorMessage(message)
        setSpreadsheet(null)
        setSnapshot(EMPTY_SNAPSHOT)
        setValidationMessage(null)
      } finally {
        setBusyState('idle')
      }
    })()
  }, [busyState, session?.accessToken, spreadsheet?.id, storedSpreadsheetId])

  async function hydrateSpreadsheet(spreadsheetId: string, accessToken: string, options?: { syncMonitor?: boolean }) {
    const connection = await fetchSpreadsheetConnection(spreadsheetId, accessToken)

    if (connection.isTemplateValid) {
      await rewriteTemplateHeaders(spreadsheetId, accessToken)
    }

    let nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, connection.sheets)

    if (options?.syncMonitor) {
      await syncMonitorSheet(spreadsheetId, accessToken, collectMonitorTickers(nextSnapshot))
      nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, connection.sheets)
    }

    setSpreadsheet(connection)
    setSnapshot(nextSnapshot)
    setStoredSpreadsheetId(spreadsheetId)
    setValidationMessage(getTemplateValidationMessage(connection))
    window.localStorage.setItem(STORAGE_KEY, spreadsheetId)

    return { connection, snapshot: nextSnapshot }
  }

  async function login() {
    if (!envConfigured) {
      setErrorMessage('Set VITE_GOOGLE_CLIENT_ID before testing Google login.')
      return
    }

    setBusyState('login')
    setErrorMessage(null)

    try {
      const accessToken = await requestGoogleAccessToken(clientId)
      const profile = await fetchGoogleUserProfile(accessToken)
      setSession({ accessToken, profile })
      setValidationMessage(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed.'
      setErrorMessage(message)
      setSession(null)
    } finally {
      setBusyState('idle')
    }
  }

  async function connectSpreadsheet(spreadsheetId: string) {
    if (!session?.accessToken) {
      setErrorMessage('Login is required before connecting a spreadsheet.')
      return
    }

    const trimmedId = spreadsheetId.trim()
    if (!trimmedId) {
      setErrorMessage('Spreadsheet ID is required.')
      return
    }

    setBusyState('spreadsheet')
    setErrorMessage(null)

    try {
      await hydrateSpreadsheet(trimmedId, session.accessToken, { syncMonitor: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect spreadsheet.'
      setErrorMessage(message)
      setSpreadsheet(null)
      setSnapshot(EMPTY_SNAPSHOT)
      setValidationMessage(null)
    } finally {
      setBusyState('idle')
    }
  }

  async function createTemplateSpreadsheetAndConnect(title = 'Stocking Portfolio') {
    if (!session?.accessToken) {
      setErrorMessage('Login is required before creating a spreadsheet.')
      return
    }

    const trimmedTitle = title.trim() || 'Stocking Portfolio'
    setBusyState('creating')
    setErrorMessage(null)

    try {
      const connection = await createTemplateSpreadsheet(trimmedTitle, session.accessToken)
      await hydrateSpreadsheet(connection.id, session.accessToken, { syncMonitor: true })
      setValidationMessage('Template spreadsheet created and connected.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create spreadsheet template.'
      setErrorMessage(message)
    } finally {
      setBusyState('idle')
    }
  }

  async function refreshSpreadsheetData() {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('No connected spreadsheet to refresh.')
      return
    }

    setBusyState('syncing')
    setErrorMessage(null)

    try {
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh spreadsheet data.'
      setErrorMessage(message)
    } finally {
      setBusyState('idle')
    }
  }

  async function resetSpreadsheetData() {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('Connect a spreadsheet before resetting data.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await resetSpreadsheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheets)
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      setValidationMessage('Sheet rows were reset. Headers were preserved.')
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset spreadsheet data.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function addHolding(draft: HoldingDraft) {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('Connect a spreadsheet before adding holdings.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      const normalizedTicker = draft.ticker.trim().toUpperCase()
      const normalizedName = draft.name.trim() || normalizedTicker
      const nextDisplayOrder = snapshot.holdings.reduce((maxOrder, row) => Math.max(maxOrder, Number(row.display_order) || 0), 0) + 1

      await appendHoldingRow(spreadsheet.id, session.accessToken, {
        row_number: 0,
        ticker: normalizedTicker,
        name: normalizedName,
        side: draft.side,
        quantity: draft.quantity,
        avg_price: draft.avgPrice,
        tags: draft.tags.trim(),
        display_order: nextDisplayOrder,
      })

      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save holding.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function updateHolding(ticker: string, draft: HoldingDraft) {
    if (!session?.accessToken || !spreadsheet?.id || !spreadsheet.sheetIds.Holdings) {
      setErrorMessage('Connect a spreadsheet before editing holdings.')
      return false
    }

    const targetRows = snapshot.holdings.filter((row) => row.ticker === ticker)
    if (targetRows.length === 0) {
      setErrorMessage('No matching holding rows were found.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await deleteSheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheetIds.Holdings, targetRows.map((row) => row.row_number))
      const normalizedTicker = draft.ticker.trim().toUpperCase()
      const normalizedName = draft.name.trim() || normalizedTicker
      const preservedDisplayOrder = targetRows
        .map((row) => Number(row.display_order) || 0)
        .find((value) => value > 0) ?? 1
      await appendHoldingRow(spreadsheet.id, session.accessToken, {
        row_number: 0,
        ticker: normalizedTicker,
        name: normalizedName,
        side: draft.side,
        quantity: draft.quantity,
        avg_price: draft.avgPrice,
        tags: draft.tags.trim(),
        display_order: preservedDisplayOrder,
      })
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update holding.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function deleteHolding(ticker: string) {
    if (!session?.accessToken || !spreadsheet?.id || !spreadsheet.sheetIds.Holdings) {
      setErrorMessage('Connect a spreadsheet before deleting holdings.')
      return false
    }

    const targetRows = snapshot.holdings.filter((row) => row.ticker === ticker).map((row) => row.row_number)
    if (targetRows.length === 0) {
      setErrorMessage('No matching holding rows were found.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await deleteSheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheetIds.Holdings, targetRows)
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete holding rows.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function reorderHoldings(tickers: string[]) {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('Connect a spreadsheet before reordering holdings.')
      return false
    }

    const normalizedTickers = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))]
    const knownTickers = [...new Set(snapshot.holdings.map((row) => row.ticker.trim().toUpperCase()).filter(Boolean))]

    if (normalizedTickers.length !== knownTickers.length) {
      setErrorMessage('Holding order could not be saved because the visible order was incomplete.')
      return false
    }

    const nextOrderMap = new Map(normalizedTickers.map((ticker, index) => [ticker, index + 1]))

    setBusyState('writing')
    setErrorMessage(null)

    try {
      const nextRows = [...snapshot.holdings]
        .map((row) => {
          const normalizedTicker = row.ticker.trim().toUpperCase()
          return {
            ...row,
            ticker: normalizedTicker,
            name: row.name.trim() || normalizedTicker,
            display_order: nextOrderMap.get(normalizedTicker) ?? normalizedTickers.length + 1,
          }
        })
        .sort((left, right) => {
          if (left.display_order !== right.display_order) {
            return left.display_order - right.display_order
          }

          return left.row_number - right.row_number
        })

      await overwriteHoldingRows(spreadsheet.id, session.accessToken, nextRows)
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save holding order.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function saveBenchmarks(drafts: BenchmarkDraft[]) {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('Connect a spreadsheet before saving benchmarks.')
      return false
    }

    if (!spreadsheet.sheets.includes('Benchmarks')) {
      setErrorMessage('Connected spreadsheet is missing the Benchmarks tab.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      const currentRowsByKey = new Map(snapshot.benchmarks.map((row) => [row.benchmark_key.trim().toUpperCase(), row]))
      const nextRows = drafts.map((draft) => {
        const benchmarkKey = draft.benchmarkKey.trim().toUpperCase()
        const tickerPrimary = draft.tickerPrimary.trim().toUpperCase()
        const tickerFallback = draft.tickerFallback.trim().toUpperCase()
        const currentRow = currentRowsByKey.get(benchmarkKey)
        const shouldResetResolution = !currentRow
          || currentRow.ticker_primary.trim().toUpperCase() !== tickerPrimary
          || currentRow.ticker_fallback.trim().toUpperCase() !== tickerFallback

        return {
          benchmark_key: benchmarkKey,
          ticker_primary: tickerPrimary,
          ticker_fallback: tickerFallback,
          resolved_ticker: shouldResetResolution
            ? tickerPrimary
            : currentRow.resolved_ticker.trim().toUpperCase() || tickerPrimary,
          resolved_source: shouldResetResolution
            ? 'primary' as const
            : currentRow.resolved_source,
          status: shouldResetResolution
            ? 'ready' as const
            : currentRow.status,
          market: draft.market.trim().toUpperCase() || 'US',
          name: draft.name.trim() || benchmarkKey,
          category: draft.category.trim() || 'INDEX',
          is_default: draft.isDefault,
          is_enabled: draft.isEnabled,
          display_order: draft.displayOrder,
          retry_count: shouldResetResolution ? 0 : currentRow.retry_count,
        }
      })

      await overwriteBenchmarkRows(spreadsheet.id, session.accessToken, nextRows, spreadsheet.sheets)
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save benchmarks.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }
  async function addWatchlist(draft: WatchlistDraft) {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('Connect a spreadsheet before adding watchlists.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      const normalizedTicker = draft.ticker.trim().toUpperCase()
      const normalizedName = draft.name.trim() || normalizedTicker

      await appendWatchlistRow(spreadsheet.id, session.accessToken, {
        row_number: 0,
        ticker: normalizedTicker,
        name: normalizedName,
        list_type: draft.listType,
        target_price: draft.targetPrice,
        virtual_qty: draft.virtualQty,
        virtual_entry_price: draft.virtualEntryPrice,
        tags: draft.tags.trim(),
      })

      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save watchlist row.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function updateWatchlist(rowNumber: number, draft: WatchlistDraft) {
    if (!session?.accessToken || !spreadsheet?.id || !spreadsheet.sheetIds.Watchlists) {
      setErrorMessage('Connect a spreadsheet before editing watchlists.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await deleteSheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheetIds.Watchlists, [rowNumber])
      const normalizedTicker = draft.ticker.trim().toUpperCase()
      const normalizedName = draft.name.trim() || normalizedTicker
      await appendWatchlistRow(spreadsheet.id, session.accessToken, {
        row_number: 0,
        ticker: normalizedTicker,
        name: normalizedName,
        list_type: draft.listType,
        target_price: draft.targetPrice,
        virtual_qty: draft.virtualQty,
        virtual_entry_price: draft.virtualEntryPrice,
        tags: draft.tags.trim(),
      })
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update watchlist row.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  async function deleteWatchlist(rowNumber: number) {
    if (!session?.accessToken || !spreadsheet?.id || !spreadsheet.sheetIds.Watchlists) {
      setErrorMessage('Connect a spreadsheet before deleting watchlists.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await deleteSheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheetIds.Watchlists, [rowNumber])
      await hydrateSpreadsheet(spreadsheet.id, session.accessToken, { syncMonitor: true })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete watchlist row.'
      setErrorMessage(message)
      return false
    } finally {
      setBusyState('idle')
    }
  }

  function logout() {
    setSession(null)
    setSpreadsheet(null)
    setSnapshot(EMPTY_SNAPSHOT)
    setValidationMessage(null)
    setErrorMessage(null)
  }

  function clearSpreadsheet() {
    window.localStorage.removeItem(STORAGE_KEY)
    setStoredSpreadsheetId('')
    setSpreadsheet(null)
    setSnapshot(EMPTY_SNAPSHOT)
    setValidationMessage(null)
    setErrorMessage(null)
  }

  const value: GoogleWorkspaceContextValue = {
    clientReady,
    envConfigured,
    busyState,
    session,
    spreadsheet,
    snapshot,
    storedSpreadsheetId,
    errorMessage,
    validationMessage,
    login,
    logout,
    connectSpreadsheet,
    createTemplateSpreadsheet: createTemplateSpreadsheetAndConnect,
    refreshSpreadsheetData,
    resetSpreadsheetData,
    addHolding,
    updateHolding,
    deleteHolding,
    reorderHoldings,
    addWatchlist,
    updateWatchlist,
    deleteWatchlist,
    saveBenchmarks,
    clearSpreadsheet,
  }

  return <GoogleWorkspaceContext.Provider value={value}>{children}</GoogleWorkspaceContext.Provider>
}














