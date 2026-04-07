export interface StocksSheetRow {
  ticker: string
  name: string
  market: string
  active: string
  memo: string
}

export interface HoldingsSheetRow {
  ticker: string
  quantity: number
  avg_price: number
  memo: string
}

export interface FavoritesSheetRow {
  ticker: string
  target_price: number
  memo: string
}

export interface IdeasSheetRow {
  portfolio_name: string
  ticker: string
  virtual_qty: number
  virtual_entry_price: number
  memo: string
}

export interface MonitorSheetRow {
  ticker: string
  full_ticker: string
  closeyest: number
  change: number
  changepct: number
  high52: number
  low52: number
  marketcap: string
  pe: number
  eps: number
  volumeavg: number
  tradetime: string
}

export interface SpreadsheetSnapshot {
  stocks: StocksSheetRow[]
  holdings: HoldingsSheetRow[]
  favorites: FavoritesSheetRow[]
  ideas: IdeasSheetRow[]
  monitor: MonitorSheetRow[]
}
