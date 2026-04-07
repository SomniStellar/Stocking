import { type PropsWithChildren, useEffect, useState } from 'react'
import type { TransactionDraft } from '../../types/domain'
import { loadGoogleIdentityScript, requestGoogleAccessToken } from '../../lib/google/googleIdentity'
import {
  appendTransactionRow,
  createTemplateSpreadsheet,
  fetchGoogleUserProfile,
  fetchSpreadsheetConnection,
  fetchSpreadsheetSnapshot,
  getTemplateValidationMessage,
} from '../../lib/google/googleSheets'
import type { GoogleSession, SpreadsheetConnection } from '../../types/google'
import type { SpreadsheetSnapshot } from '../../types/sheets'
import {
  GoogleWorkspaceContext,
  type GoogleWorkspaceContextValue,
} from './GoogleWorkspaceContext'

const STORAGE_KEY = 'stocking.spreadsheetId'

const EMPTY_SNAPSHOT: SpreadsheetSnapshot = {
  stocks: [],
  holdings: [],
  favorites: [],
  ideas: [],
  transactions: [],
  monitor: [],
}

export function GoogleWorkspaceProvider({ children }: PropsWithChildren) {
  const [clientReady, setClientReady] = useState(false)
  const [session, setSession] = useState<GoogleSession | null>(null)
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetConnection | null>(null)
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

  async function hydrateSpreadsheet(spreadsheetId: string, accessToken: string) {
    const connection = await fetchSpreadsheetConnection(spreadsheetId, accessToken)
    const nextSnapshot = await fetchSpreadsheetSnapshot(
      spreadsheetId,
      accessToken,
      connection.sheets,
    )

    setSpreadsheet(connection)
    setSnapshot(nextSnapshot)
    setStoredSpreadsheetId(spreadsheetId)
    setValidationMessage(getTemplateValidationMessage(connection))
    window.localStorage.setItem(STORAGE_KEY, spreadsheetId)
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
      await hydrateSpreadsheet(trimmedId, session.accessToken)
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
      const nextSnapshot = await fetchSpreadsheetSnapshot(connection.id, session.accessToken, connection.sheets)
      setSpreadsheet(connection)
      setSnapshot(nextSnapshot)
      setStoredSpreadsheetId(connection.id)
      setValidationMessage('Template spreadsheet created and connected.')
      window.localStorage.setItem(STORAGE_KEY, connection.id)
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
      const nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheet.id, session.accessToken, spreadsheet.sheets)
      setSnapshot(nextSnapshot)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh spreadsheet data.'
      setErrorMessage(message)
    } finally {
      setBusyState('idle')
    }
  }

  async function addTransaction(draft: TransactionDraft) {
    if (!session?.accessToken || !spreadsheet?.id) {
      setErrorMessage('Connect a spreadsheet before recording trades.')
      return false
    }

    setBusyState('writing')
    setErrorMessage(null)

    try {
      await appendTransactionRow(spreadsheet.id, session.accessToken, {
        date: draft.date,
        ticker: draft.ticker.trim().toUpperCase(),
        type: draft.type,
        quantity: draft.quantity,
        price: draft.price,
        fee: draft.fee,
        memo: draft.memo.trim(),
      })

      const nextConnection = await fetchSpreadsheetConnection(spreadsheet.id, session.accessToken)
      const nextSnapshot = await fetchSpreadsheetSnapshot(spreadsheet.id, session.accessToken, nextConnection.sheets)
      setSpreadsheet(nextConnection)
      setSnapshot(nextSnapshot)
      setValidationMessage(getTemplateValidationMessage(nextConnection))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save transaction.'
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
    addTransaction,
    clearSpreadsheet,
  }

  return (
    <GoogleWorkspaceContext.Provider value={value}>
      {children}
    </GoogleWorkspaceContext.Provider>
  )
}
