export interface HoldingsSheetRow {
  ticker: string
  name: string
  quantity: number
  avg_price: number
  tags: string
}

export interface WatchlistsSheetRow {
  ticker: string
  name: string
  list_type: string
  target_price: number
  virtual_qty: number
  virtual_entry_price: number
  tags: string
}

export interface CashSheetRow {
  account_name: string
  currency: string
  amount: number
  tags: string
}

export interface MonitorSheetRow {
  ticker: string
  full_ticker: string
  closeyest: number
  ytd_price: number
  price_3y: number
  price_5y: number
  tradetime: string
}

export interface SpreadsheetSnapshot {
  holdings: HoldingsSheetRow[]
  watchlists: WatchlistsSheetRow[]
  cash: CashSheetRow[]
  monitor: MonitorSheetRow[]
}