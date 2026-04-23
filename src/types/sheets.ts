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
  price_1y: number
  price_3y: number
  price_5y: number
  tradetime: string
}

export interface BenchmarksSheetRow {
  benchmark_key: string
  ticker_primary: string
  ticker_fallback: string
  resolved_ticker: string
  resolved_source: 'primary' | 'fallback'
  status: 'ready' | 'retrying' | 'fallback' | 'failed'
  market: string
  name: string
  category: string
  accent_color: string
  is_default: boolean
  is_enabled: boolean
  display_order: number
  retry_count: number
}

export interface SeriesCalendarSheetRow {
  calendar_key: string
  calendar_type: 'DAILY' | 'WEEKLY'
  point_date: string
  week_anchor: string
  period_scope: 'YTD' | 'LONG'
}

export interface SeriesSheetRow {
  series_key: string
  series_type: 'portfolio' | 'benchmark'
  ticker: string
  name: string
  sample_type: 'DAILY' | 'WEEKLY'
  point_date: string
  point_value: number
}

export interface SpreadsheetSnapshot {
  holdings: HoldingsSheetRow[]
  watchlists: WatchlistsSheetRow[]
  monitor: MonitorSheetRow[]
  benchmarks: BenchmarksSheetRow[]
  seriesCalendar: SeriesCalendarSheetRow[]
  series: SeriesSheetRow[]
}
