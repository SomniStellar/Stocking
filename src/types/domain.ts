export interface StockMonitorRow {
  ticker: string
  name: string
  closeyest: number
  change: number
  changepct: number
  high52: number
  low52: number
  marketcap: string
  pe: number
  eps: number
}

export interface HoldingRow {
  ticker: string
  quantity: number
  avgPrice: number
  closeyest: number
  invested: number
  marketValue: number
  unrealizedProfit: number
  unrealizedReturn: number
}

export interface FavoriteRow {
  ticker: string
  name: string
  targetPrice: number
  closeyest: number
  changepct: number
}

export interface IdeaRow {
  portfolioName: string
  ticker: string
  name: string
  virtualQty: number
  virtualEntryPrice: number
  closeyest: number
}

export interface TransactionDraft {
  date: string
  ticker: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  fee: number
  memo: string
}
