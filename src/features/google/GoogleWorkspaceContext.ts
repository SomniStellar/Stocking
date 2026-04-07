import { createContext, useContext } from 'react'
import type { GoogleSession, SpreadsheetConnection } from '../../types/google'
import type { TransactionDraft } from '../../types/domain'
import type { SpreadsheetSnapshot } from '../../types/sheets'

export interface GoogleWorkspaceContextValue {
  clientReady: boolean
  envConfigured: boolean
  busyState: 'idle' | 'login' | 'spreadsheet' | 'creating' | 'syncing' | 'writing'
  session: GoogleSession | null
  spreadsheet: SpreadsheetConnection | null
  snapshot: SpreadsheetSnapshot
  storedSpreadsheetId: string
  errorMessage: string | null
  validationMessage: string | null
  login: () => Promise<void>
  logout: () => void
  connectSpreadsheet: (spreadsheetId: string) => Promise<void>
  createTemplateSpreadsheet: (title?: string) => Promise<void>
  refreshSpreadsheetData: () => Promise<void>
  addTransaction: (draft: TransactionDraft) => Promise<boolean>
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
