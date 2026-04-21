export interface StockMonitorRow {
  ticker: string
  closeyest: number
  ytdPrice: number
  price1Y: number
  price3Y: number
  price5Y: number
}

export type ComparisonPeriod = 'YTD' | '3Y' | '5Y'

export type BenchmarkResolvedSource = 'primary' | 'fallback'

export type BenchmarkStatus = 'ready' | 'retrying' | 'fallback' | 'failed'

export interface BenchmarkDefinition {
  benchmarkKey: string
  tickerPrimary: string
  tickerFallback: string
  resolvedTicker: string
  resolvedSource: BenchmarkResolvedSource
  status: BenchmarkStatus
  market: string
  name: string
  category: string
  isDefault: boolean
  isEnabled: boolean
  displayOrder: number
  retryCount: number
}

export interface BenchmarkDraft {
  benchmarkKey: string
  name: string
  tickerPrimary: string
  tickerFallback: string
  category: string
  market: string
  isDefault: boolean
  isEnabled: boolean
  displayOrder: number
}

export interface SeriesCalendarEntry {
  calendarKey: string
  calendarType: 'DAILY' | 'WEEKLY'
  pointDate: string
  weekAnchor: string
  periodScope: 'YTD' | 'LONG'
}

export interface SeriesPoint {
  seriesKey: string
  seriesType: 'portfolio' | 'benchmark'
  ticker: string
  name: string
  sampleType: 'DAILY' | 'WEEKLY'
  pointDate: string
  pointValue: number
}

export interface BenchmarkComparisonCard {
  benchmarkKey: string
  name: string
  period: ComparisonPeriod
  resolvedSource: BenchmarkResolvedSource
  status: BenchmarkStatus
  value: number
  deltaFromPortfolio: number
  caption: string
  isEnabled: boolean
  isRenderable: boolean
  isDefault: boolean
}

export interface DashboardSummaryMetrics {
  totalInvested: number
  totalValue: number
  totalProfit: number
  totalYield: number
}

export interface DashboardComparisonChartPoint {
  pointDate: string
  label: string
  portfolio: number
  [benchmarkKey: string]: string | number
}

export interface DashboardComparisonChartLine {
  benchmarkKey: string
  name: string
  color: string
  isPortfolio: boolean
}

export interface DashboardRangeChartModel {
  period: ComparisonPeriod
  points: DashboardComparisonChartPoint[]
  lines: DashboardComparisonChartLine[]
  hasData: boolean
  emptyMessage: string
}

export interface HoldingRow {
  ticker: string
  name: string
  quantity: number
  avgPrice: number
  closeyest: number
  invested: number
  marketValue: number
  unrealizedProfit: number
  unrealizedReturn: number
  ytdReturn: number
  return1Y: number
  return3Y: number
  return5Y: number
  tags: string
  displayOrder: number
  sourceRowNumbers: number[]
}

export interface WatchlistRow {
  rowNumber: number
  ticker: string
  name: string
  listType: string
  targetPrice: number
  virtualQty: number
  virtualEntryPrice: number
  closeyest: number
  tags: string
}

export interface HoldingDraft {
  ticker: string
  name: string
  side: 'BUY' | 'SELL'
  quantity: number
  avgPrice: number
  tags: string
}

export interface WatchlistDraft {
  ticker: string
  name: string
  listType: 'FAVORITE' | 'IDEA'
  targetPrice: number
  virtualQty: number
  virtualEntryPrice: number
  tags: string
}
