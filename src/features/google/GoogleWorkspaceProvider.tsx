import { type PropsWithChildren, useEffect, useState } from 'react'
import { loadGoogleIdentityScript, requestGoogleAccessToken } from '../../lib/google/googleIdentity'
import {
  fetchGoogleUserProfile,
  fetchSpreadsheetConnection,
  getTemplateValidationMessage,
} from '../../lib/google/googleSheets'
import type { GoogleSession, SpreadsheetConnection } from '../../types/google'
import {
  GoogleWorkspaceContext,
  type GoogleWorkspaceContextValue,
} from './GoogleWorkspaceContext'

const STORAGE_KEY = 'stocking.spreadsheetId'

export function GoogleWorkspaceProvider({ children }: PropsWithChildren) {
  const [clientReady, setClientReady] = useState(false)
  const [session, setSession] = useState<GoogleSession | null>(null)
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetConnection | null>(null)
  const [storedSpreadsheetId, setStoredSpreadsheetId] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [busyState, setBusyState] = useState<'idle' | 'login' | 'spreadsheet'>('idle')

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
      const connection = await fetchSpreadsheetConnection(trimmedId, session.accessToken)
      setSpreadsheet(connection)
      setStoredSpreadsheetId(trimmedId)
      setValidationMessage(getTemplateValidationMessage(connection))
      window.localStorage.setItem(STORAGE_KEY, trimmedId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect spreadsheet.'
      setErrorMessage(message)
      setSpreadsheet(null)
      setValidationMessage(null)
    } finally {
      setBusyState('idle')
    }
  }

  function logout() {
    setSession(null)
    setSpreadsheet(null)
    setValidationMessage(null)
    setErrorMessage(null)
  }

  function clearSpreadsheet() {
    window.localStorage.removeItem(STORAGE_KEY)
    setStoredSpreadsheetId('')
    setSpreadsheet(null)
    setValidationMessage(null)
    setErrorMessage(null)
  }

  const value: GoogleWorkspaceContextValue = {
    clientReady,
    envConfigured,
    busyState,
    session,
    spreadsheet,
    storedSpreadsheetId,
    errorMessage,
    validationMessage,
    login,
    logout,
    connectSpreadsheet,
    clearSpreadsheet,
  }

  return (
    <GoogleWorkspaceContext.Provider value={value}>
      {children}
    </GoogleWorkspaceContext.Provider>
  )
}
