import { createContext, useContext } from 'react'
import type { GoogleSession, SpreadsheetConnection } from '../../types/google'

export interface GoogleWorkspaceContextValue {
  clientReady: boolean
  envConfigured: boolean
  busyState: 'idle' | 'login' | 'spreadsheet'
  session: GoogleSession | null
  spreadsheet: SpreadsheetConnection | null
  storedSpreadsheetId: string
  errorMessage: string | null
  validationMessage: string | null
  login: () => Promise<void>
  logout: () => void
  connectSpreadsheet: (spreadsheetId: string) => Promise<void>
  clearSpreadsheet: () => void
}

export const GoogleWorkspaceContext =
  createContext<GoogleWorkspaceContextValue | null>(null)

export function useGoogleWorkspace() {
  const context = useContext(GoogleWorkspaceContext)

  if (!context) {
    throw new Error('useGoogleWorkspace must be used within GoogleWorkspaceProvider.')
  }

  return context
}
