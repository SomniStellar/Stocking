export interface StockMonitorRow {
  ticker: string
  closeyest: number
  ytdPrice: number
  price3Y: number
  price5Y: number
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
  return3Y: number
  return5Y: number
  tags: string
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
