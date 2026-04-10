export interface HoldingsSheetRow {
  row_number: number
  ticker: string
  name: string
  side: 'BUY' | 'SELL'
  quantity: number
  avg_price: number
  tags: string
  display_order: number
}

export interface WatchlistsSheetRow {
  row_number: number
  ticker: string
  name: string
  list_type: string
  target_price: number
  virtual_qty: number
  virtual_entry_price: number
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
  monitor: MonitorSheetRow[]
}