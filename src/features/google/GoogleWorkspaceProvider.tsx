import { type PropsWithChildren, useEffect, useState } from 'react'
import type { BenchmarkDraft, HoldingDraft, WatchlistDraft } from '../../types/domain'
import { loadGoogleIdentityScript, requestGoogleAccessToken } from '../../lib/google/googleIdentity'
import {
  appendHoldingRow,
  appendWatchlistRow,
  createTemplateSpreadsheet,
  deleteSheetRows,
  ensureOptionalTemplateTabs,
  fetchGoogleUserProfile,
  fetchSpreadsheetConnection,
  fetchSpreadsheetSnapshot,
  getTemplateValidationMessage,
  overwriteBenchmarkRows,
  overwriteHoldingRows,
  resetSpreadsheetRows,
  rewriteTemplateHeaders,
  syncMonitorSheet,
  syncSeriesSheets,
} from '../../lib/google/googleSheets'
import { DEFAULT_BENCHMARK_DRAFTS } from '../benchmarks/benchmarkDrafts'
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
    { benchmark_key: 'NASDAQ100', ticker_primary: 'QQQ', ticker_fallback: '', resolved_ticker: 'QQQ', resolved_source: 'primary', status: 'ready', market: 'US', name: 'Nasdaq 100', category: 'INDEX', accent_color: '#8dc6ff', is_default: true, is_enabled: true, display_order: 1, retry_count: 0 },
    { benchmark_key: 'SP500', ticker_primary: 'SPY', ticker_fallback: '', resolved_ticker: 'SPY', resolved_source: 'primary', status: 'ready', market: 'US', name: 'S&P 500', category: 'INDEX', accent_color: '#78e0a5', is_default: true, is_enabled: true, display_order: 2, retry_count: 0 },
    { benchmark_key: 'DOW', ticker_primary: 'DIA', ticker_fallback: '', resolved_ticker: 'DIA', resolved_source: 'primary', status: 'ready', market: 'US', name: 'Dow Jones', category: 'INDEX', accent_color: '#ffd28a', is_default: true, is_enabled: true, display_order: 3, retry_count: 0 },
  ],
  seriesCalendar: [
    { calendar_key: 'CAL_D_2026_01_02', calendar_type: 'DAILY', point_date: '2026-01-02', week_anchor: '', period_scope: 'YTD' },
    { calendar_key: 'CAL_D_2026_02_03', calendar_type: 'DAILY', point_date: '2026-02-03', week_anchor: '', period_scope: 'YTD' },
    { calendar_key: 'CAL_D_2026_03_03', calendar_type: 'DAILY', point_date: '2026-03-03', week_anchor: '', period_scope: 'YTD' },
    { calendar_key: 'CAL_D_2026_04_10', calendar_type: 'DAILY', point_date: '2026-04-10', week_anchor: '', period_scope: 'YTD' },
    { calendar_key: 'CAL_W_2021_04_09', calendar_type: 'WEEKLY', point_date: '2021-04-09', week_anchor: '2021-04-09', period_scope: 'LONG' },
    { calendar_key: 'CAL_W_2022_04_08', calendar_type: 'WEEKLY', point_date: '2022-04-08', week_anchor: '2022-04-08', period_scope: 'LONG' },
    { calendar_key: 'CAL_W_2023_04_07', calendar_type: 'WEEKLY', point_date: '2023-04-07', week_anchor: '2023-04-07', period_scope: 'LONG' },
    { calendar_key: 'CAL_W_2024_04_12', calendar_type: 'WEEKLY', point_date: '2024-04-12', week_anchor: '2024-04-12', period_scope: 'LONG' },
    { calendar_key: 'CAL_W_2025_04_11', calendar_type: 'WEEKLY', point_date: '2025-04-11', week_anchor: '2025-04-11', period_scope: 'LONG' },
    { calendar_key: 'CAL_W_2026_04_10', calendar_type: 'WEEKLY', point_date: '2026-04-10', week_anchor: '2026-04-10', period_scope: 'LONG' },
  ],
  series: [
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'DAILY', point_date: '2026-01-02', point_value: 11762.84 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'DAILY', point_date: '2026-02-03', point_value: 12106.8 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'DAILY', point_date: '2026-03-03', point_value: 12414.55 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'DAILY', point_date: '2026-04-10', point_value: 12837.5 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'WEEKLY', point_date: '2021-04-09', point_value: 9102.48 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'WEEKLY', point_date: '2022-04-08', point_value: 10215.74 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'WEEKLY', point_date: '2023-04-07', point_value: 10804.27 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'WEEKLY', point_date: '2024-04-12', point_value: 11526.31 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'WEEKLY', point_date: '2025-04-11', point_value: 12134.62 },
    { series_key: 'PORTFOLIO', series_type: 'portfolio', ticker: 'PORTFOLIO', name: 'Portfolio', sample_type: 'WEEKLY', point_date: '2026-04-10', point_value: 12837.5 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'DAILY', point_date: '2026-01-02', point_value: 100 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'DAILY', point_date: '2026-02-03', point_value: 102.2 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'DAILY', point_date: '2026-03-03', point_value: 104.8 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'DAILY', point_date: '2026-04-10', point_value: 105.7 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'WEEKLY', point_date: '2021-04-09', point_value: 100 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'WEEKLY', point_date: '2022-04-08', point_value: 109 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'WEEKLY', point_date: '2023-04-07', point_value: 114 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'WEEKLY', point_date: '2024-04-12', point_value: 121 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'WEEKLY', point_date: '2025-04-11', point_value: 127 },
    { series_key: 'SP500', series_type: 'benchmark', ticker: 'SPY', name: 'S&P 500', sample_type: 'WEEKLY', point_date: '2026-04-10', point_value: 132 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'DAILY', point_date: '2026-01-02', point_value: 100 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'DAILY', point_date: '2026-02-03', point_value: 103.8 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'DAILY', point_date: '2026-03-03', point_value: 106.1 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'DAILY', point_date: '2026-04-10', point_value: 108.8 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'WEEKLY', point_date: '2021-04-09', point_value: 100 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'WEEKLY', point_date: '2022-04-08', point_value: 111 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'WEEKLY', point_date: '2023-04-07', point_value: 116 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'WEEKLY', point_date: '2024-04-12', point_value: 124 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'WEEKLY', point_date: '2025-04-11', point_value: 129 },
    { series_key: 'NASDAQ100', series_type: 'benchmark', ticker: 'QQQ', name: 'Nasdaq 100', sample_type: 'WEEKLY', point_date: '2026-04-10', point_value: 136 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'DAILY', point_date: '2026-01-02', point_value: 100 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'DAILY', point_date: '2026-02-03', point_value: 101.1 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'DAILY', point_date: '2026-03-03', point_value: 102.9 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'DAILY', point_date: '2026-04-10', point_value: 103.6 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'WEEKLY', point_date: '2021-04-09', point_value: 100 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'WEEKLY', point_date: '2022-04-08', point_value: 107 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'WEEKLY', point_date: '2023-04-07', point_value: 111 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'WEEKLY', point_date: '2024-04-12', point_value: 117 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'WEEKLY', point_date: '2025-04-11', point_value: 122 },
    { series_key: 'DOW', series_type: 'benchmark', ticker: 'DIA', name: 'Dow Jones', sample_type: 'WEEKLY', point_date: '2026-04-10', point_value: 126 },
  ],
}

const PREVIEW_SPREADSHEET = {
  id: 'dev-preview-workspace',
  title: 'Workspace Preview',
  url: 'https://example.invalid/dev-preview-workspace',
  sheets: ['Holdings', 'Watchlists', 'Monitor', 'Benchmarks', 'SeriesCalendar', 'Series'],
  sheetIds: { Holdings: 0, Watchlists: 1, Monitor: 2, Benchmarks: 3, SeriesCalendar: 4, Series: 5 },
  isTemplateValid: true,
  checkedAt: new Date('2026-04-10T00:00:00.000Z').toISOString(),
} satisfies GoogleWorkspaceContextValue['spreadsheet']

function buildSeedBenchmarkRows(existingRows: SpreadsheetSnapshot['benchmarks']) {
  const existingByKey = new Map(existingRows.map((row) => [row.benchmark_key.trim().toUpperCase(), row]))
  const defaultRows = DEFAULT_BENCHMARK_DRAFTS.map((draft) => {
    const existing = existingByKey.get(draft.benchmarkKey)

      return {
        benchmark_key: draft.benchmarkKey,
        ticker_primary: draft.tickerPrimary,
        ticker_fallback: existing?.ticker_fallback ?? draft.tickerFallback,
        resolved_ticker: existing?.resolved_ticker || draft.tickerPrimary,
        resolved_source: existing?.resolved_source ?? 'primary',
        status: existing?.status ?? 'ready',
        market: draft.market,
        name: draft.name,
        category: draft.category,
        accent_color: existing?.accent_color ?? draft.accentColor,
        is_default: true,
        is_enabled: existing?.is_enabled ?? draft.isEnabled,
        display_order: draft.displayOrder,
      retry_count: existing?.retry_count ?? 0,
    }
  })

  const customRows = existingRows
    .filter((row) => !row.is_default)
    .sort((left, right) => left.display_order - right.display_order)
    .map((row, index) => ({
      ...row,
      display_order: DEFAULT_BENCHMARK_DRAFTS.length + index + 1,
    }))

  return [...defaultRows, ...customRows]
}

function collectMonitorTickers(snapshot: SpreadsheetSnapshot) {
  return [...new Set([
    ...snapshot.holdings.map((row) => row.ticker),
    ...snapshot.watchlists.map((row) => row.ticker),
    ...snapshot.benchmarks.filter((row) => row.is_enabled).map((row) => row.resolved_ticker || row.ticker_primary),
  ].map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))]
}

function hasBenchmarkSeries(snapshot: SpreadsheetSnapshot, benchmarkKey: string, ticker: string) {
  const normalizedKey = benchmarkKey.trim().toUpperCase()
  const normalizedTicker = ticker.trim().toUpperCase()

  return snapshot.series.some((row) => (
    row.series_type === 'benchmark'
    && (
      row.series_key.trim().toUpperCase() === normalizedKey
      || row.ticker.trim().toUpperCase() === normalizedTicker
    )
  ))
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
        name: 'Workspace Preview',
      },
    })
    setSpreadsheet(PREVIEW_SPREADSHEET)
    setSnapshot(PREVIEW_HOLDINGS_SNAPSHOT)
    setStoredSpreadsheetId('')
    setValidationMessage(null)
    setErrorMessage(null)
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
        await refreshConnectedSpreadsheet(storedSpreadsheetId, session.accessToken, {
          syncMonitor: false,
          syncSeries: false,
        })
        refreshBenchmarksInBackground(storedSpreadsheetId, session.accessToken, {
          syncMonitor: true,
          syncSeries: true,
        })
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

  async function hydrateSpreadsheet(spreadsheetId: string, accessToken: string, options?: { syncMonitor?: boolean; syncSeries?: boolean }) {
    let connection = await fetchSpreadsheetConnection(spreadsheetId, accessToken)

    if (connection.isTemplateValid) {
      const ensuredSheets = await ensureOptionalTemplateTabs(spreadsheetId, accessToken, connection.sheets)
      const optionalTabsAdded = ensuredSheets.length !== connection.sheets.length
      connection = optionalTabsAdded
        ? await fetchSpreadsheetConnection(spreadsheetId, accessToken)
        : connection

      if (optionalTabsAdded) {
        await rewriteTemplateHeaders(spreadsheetId, accessToken, connection.sheets)
      }
    }

    let nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, connection.sheets)

    const seededDefaultCount = nextSnapshot.benchmarks.filter((row) => row.is_default).length

    if (connection.sheets.includes('Benchmarks') && seededDefaultCount < DEFAULT_BENCHMARK_DRAFTS.length) {
      await overwriteBenchmarkRows(
        spreadsheetId,
        accessToken,
        buildSeedBenchmarkRows(nextSnapshot.benchmarks),
        connection.sheets,
      )
      nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, connection.sheets)
    }

    if (options?.syncMonitor) {
      await syncMonitorSheet(spreadsheetId, accessToken, collectMonitorTickers(nextSnapshot))
      nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, connection.sheets)
    }

    if (options?.syncSeries) {
      await syncSeriesSheets(spreadsheetId, accessToken, nextSnapshot, connection.sheets)
      nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, connection.sheets)
    }

    setSpreadsheet(connection)
    setSnapshot(nextSnapshot)
    setStoredSpreadsheetId(spreadsheetId)
    setValidationMessage(getTemplateValidationMessage(connection))
    window.localStorage.setItem(STORAGE_KEY, spreadsheetId)

    return { connection, snapshot: nextSnapshot }
  }

  async function refreshConnectedSpreadsheet(
    spreadsheetId: string,
    accessToken: string,
    options?: { syncMonitor?: boolean; syncSeries?: boolean },
  ) {
    return hydrateSpreadsheet(spreadsheetId, accessToken, {
      syncMonitor: options?.syncMonitor ?? true,
      syncSeries: options?.syncSeries ?? true,
    })
  }

  async function reloadSpreadsheetSnapshot(
    spreadsheetId: string,
    accessToken: string,
    availableSheets?: string[],
  ) {
    const nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheetId, accessToken, availableSheets ?? spreadsheet?.sheets)
    setSnapshot(nextSnapshot)
    return nextSnapshot
  }

  function refreshHoldingsInBackground(
    spreadsheetId: string,
    accessToken: string,
    options?: { syncMonitor?: boolean },
  ) {
    void (async () => {
      try {
        if (options?.syncMonitor) {
          await refreshConnectedSpreadsheet(spreadsheetId, accessToken, { syncMonitor: true, syncSeries: false })
          return
        }

        await reloadSpreadsheetSnapshot(spreadsheetId, accessToken, spreadsheet?.sheets)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh holdings data.'
        setErrorMessage(message)
      }
    })()
  }

  function refreshBenchmarksInBackground(
    spreadsheetId: string,
    accessToken: string,
    options?: { syncMonitor?: boolean; syncSeries?: boolean },
  ) {
    void (async () => {
      try {
        await refreshConnectedSpreadsheet(spreadsheetId, accessToken, {
          syncMonitor: options?.syncMonitor ?? true,
          syncSeries: options?.syncSeries ?? true,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh benchmark data.'
        setErrorMessage(message)
      }
    })()
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
      await refreshConnectedSpreadsheet(trimmedId, session.accessToken, {
        syncMonitor: false,
        syncSeries: false,
      })
      refreshBenchmarksInBackground(trimmedId, session.accessToken, {
        syncMonitor: true,
        syncSeries: true,
      })
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
      await refreshConnectedSpreadsheet(connection.id, session.accessToken, {
        syncMonitor: false,
        syncSeries: false,
      })
      refreshBenchmarksInBackground(connection.id, session.accessToken, {
        syncMonitor: true,
        syncSeries: true,
      })
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
      await refreshConnectedSpreadsheet(spreadsheet.id, session.accessToken, { syncSeries: false })
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
      await refreshConnectedSpreadsheet(spreadsheet.id, session.accessToken, { syncSeries: false })
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
      const nextRowNumber = snapshot.holdings.reduce((maxRowNumber, row) => Math.max(maxRowNumber, row.row_number), 1) + 1
      const shouldSyncMonitor = !snapshot.monitor.some((row) => row.ticker.trim().toUpperCase() === normalizedTicker)

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

      setSnapshot((current) => ({
        ...current,
        holdings: [
          ...current.holdings,
          {
            row_number: nextRowNumber,
            ticker: normalizedTicker,
            name: normalizedName,
            side: draft.side,
            quantity: draft.quantity,
            avg_price: draft.avgPrice,
            tags: draft.tags.trim(),
            display_order: nextDisplayOrder,
          },
        ],
      }))
      refreshHoldingsInBackground(spreadsheet.id, session.accessToken, { syncMonitor: shouldSyncMonitor })
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
    if (!session?.accessToken || !spreadsheet?.id || spreadsheet.sheetIds.Holdings == null) {
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
      const originalTicker = ticker.trim().toUpperCase()
      const nextRowNumber = snapshot.holdings.reduce((maxRowNumber, row) => Math.max(maxRowNumber, row.row_number), 1) + 1
      const preservedDisplayOrder = targetRows
        .map((row) => Number(row.display_order) || 0)
        .find((value) => value > 0) ?? 1
      const shouldSyncMonitor = normalizedTicker !== originalTicker
        && !snapshot.monitor.some((row) => row.ticker.trim().toUpperCase() === normalizedTicker)
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
      setSnapshot((current) => ({
        ...current,
        holdings: [
          ...current.holdings.filter((row) => row.ticker !== ticker),
          {
            row_number: nextRowNumber,
            ticker: normalizedTicker,
            name: normalizedName,
            side: draft.side,
            quantity: draft.quantity,
            avg_price: draft.avgPrice,
            tags: draft.tags.trim(),
            display_order: preservedDisplayOrder,
          },
        ],
      }))
      refreshHoldingsInBackground(spreadsheet.id, session.accessToken, { syncMonitor: shouldSyncMonitor })
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
    if (!session?.accessToken || !spreadsheet?.id || spreadsheet.sheetIds.Holdings == null) {
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
      setSnapshot((current) => ({
        ...current,
        holdings: current.holdings.filter((row) => row.ticker !== ticker),
      }))
      refreshHoldingsInBackground(spreadsheet.id, session.accessToken, { syncMonitor: false })
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
      setSnapshot((current) => ({
        ...current,
        holdings: nextRows,
      }))
      void reloadSpreadsheetSnapshot(spreadsheet.id, session.accessToken, spreadsheet.sheets).catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to refresh reordered holdings.'
        setErrorMessage(message)
      })
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
          accent_color: draft.accentColor,
          is_default: draft.isDefault,
          is_enabled: draft.isEnabled,
          display_order: draft.displayOrder,
          retry_count: shouldResetResolution ? 0 : currentRow.retry_count,
        }
      })
      const nextEnabledRows = nextRows.filter((row) => row.is_enabled)
      const shouldSyncMonitor = nextEnabledRows.some((row) => {
        const resolvedTicker = (row.resolved_ticker || row.ticker_primary).trim().toUpperCase()
        return resolvedTicker.length > 0
          && !snapshot.monitor.some((monitorRow) => monitorRow.ticker.trim().toUpperCase() === resolvedTicker)
      })
      const shouldSyncSeries = nextEnabledRows.some((row) => {
        const currentRow = currentRowsByKey.get(row.benchmark_key)
        const resolvedTicker = (row.resolved_ticker || row.ticker_primary).trim().toUpperCase()
        const isNewRow = !currentRow
        const tickerChanged = currentRow
          ? currentRow.ticker_primary.trim().toUpperCase() !== row.ticker_primary
            || currentRow.ticker_fallback.trim().toUpperCase() !== row.ticker_fallback
          : false
        const becameEnabled = currentRow ? !currentRow.is_enabled && row.is_enabled : row.is_enabled

        return row.is_enabled && (
          isNewRow
          || tickerChanged
          || becameEnabled
          || !hasBenchmarkSeries(snapshot, row.benchmark_key, resolvedTicker)
        )
      })

      await overwriteBenchmarkRows(spreadsheet.id, session.accessToken, nextRows, spreadsheet.sheets)
      setSnapshot((current) => ({
        ...current,
        benchmarks: nextRows,
      }))
      if (shouldSyncMonitor || shouldSyncSeries) {
        refreshBenchmarksInBackground(spreadsheet.id, session.accessToken, {
          syncMonitor: shouldSyncMonitor,
          syncSeries: shouldSyncSeries,
        })
      }
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

      await refreshConnectedSpreadsheet(spreadsheet.id, session.accessToken, { syncSeries: false })
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
    if (!session?.accessToken || !spreadsheet?.id || spreadsheet.sheetIds.Watchlists == null) {
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
      await refreshConnectedSpreadsheet(spreadsheet.id, session.accessToken, { syncSeries: false })
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
    if (!session?.accessToken || !spreadsheet?.id || spreadsheet.sheetIds.Watchlists == null) {
      setErrorMessage('Connect a spreadsheet before deleting watchlists.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await deleteSheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheetIds.Watchlists, [rowNumber])
      await refreshConnectedSpreadsheet(spreadsheet.id, session.accessToken, { syncSeries: false })
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














