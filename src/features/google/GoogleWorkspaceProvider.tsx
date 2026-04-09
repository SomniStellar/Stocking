import { type PropsWithChildren, useEffect, useState } from 'react'
import type { HoldingDraft, WatchlistDraft } from '../../types/domain'
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
  resetSpreadsheetRows,
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
}

function collectMonitorTickers(snapshot: SpreadsheetSnapshot) {
  return [...new Set([
    ...snapshot.holdings.map((row) => row.ticker),
    ...snapshot.watchlists.map((row) => row.ticker),
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
      await resetSpreadsheetRows(spreadsheet.id, session.accessToken)
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

      await appendHoldingRow(spreadsheet.id, session.accessToken, {
        row_number: 0,
        ticker: normalizedTicker,
        name: normalizedName,
        side: draft.side,
        quantity: draft.quantity,
        avg_price: draft.avgPrice,
        tags: draft.tags.trim(),
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

    const targetRows = snapshot.holdings.filter((row) => row.ticker === ticker).map((row) => row.row_number)
    if (targetRows.length === 0) {
      setErrorMessage('No matching holding rows were found.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await deleteSheetRows(spreadsheet.id, session.accessToken, spreadsheet.sheetIds.Holdings, targetRows)
      const normalizedTicker = draft.ticker.trim().toUpperCase()
      const normalizedName = draft.name.trim() || normalizedTicker
      await appendHoldingRow(spreadsheet.id, session.accessToken, {
        row_number: 0,
        ticker: normalizedTicker,
        name: normalizedName,
        side: draft.side,
        quantity: draft.quantity,
        avg_price: draft.avgPrice,
        tags: draft.tags.trim(),
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
    addWatchlist,
    updateWatchlist,
    deleteWatchlist,
    clearSpreadsheet,
  }

  return <GoogleWorkspaceContext.Provider value={value}>{children}</GoogleWorkspaceContext.Provider>
}
