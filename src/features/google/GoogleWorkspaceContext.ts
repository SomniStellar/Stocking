import { createContext, useContext } from 'react'
import type { HoldingDraft, WatchlistDraft } from '../../types/domain'
import type { GoogleSession, SpreadsheetConnection } from '../../types/google'
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
  resetSpreadsheetData: () => Promise<boolean>
  addHolding: (draft: HoldingDraft) => Promise<boolean>
  updateHolding: (ticker: string, draft: HoldingDraft) => Promise<boolean>
  deleteHolding: (ticker: string) => Promise<boolean>
  addWatchlist: (draft: WatchlistDraft) => Promise<boolean>
  updateWatchlist: (rowNumber: number, draft: WatchlistDraft) => Promise<boolean>
  deleteWatchlist: (rowNumber: number) => Promise<boolean>
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
