import type { FavoriteRow, HoldingRow, IdeaRow, StockMonitorRow } from '../types/domain'

export const monitorRows: StockMonitorRow[] = [
  {
    ticker: 'AAPL',
    name: 'Apple',
    closeyest: 214.31,
    change: 1.84,
    changepct: 0.87,
    high52: 237.23,
    low52: 164.08,
    marketcap: '$3.2T',
    pe: 31.5,
    eps: 6.8,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    closeyest: 427.12,
    change: -3.22,
    changepct: -0.75,
    high52: 468.35,
    low52: 367.24,
    marketcap: '$3.1T',
    pe: 36.4,
    eps: 11.74,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA',
    closeyest: 901.48,
    change: 12.26,
    changepct: 1.38,
    high52: 974,
    low52: 604.21,
    marketcap: '$2.2T',
    pe: 58.3,
    eps: 15.46,
  },
]

export const holdings: HoldingRow[] = [
  { ticker: 'AAPL', quantity: 12, avgPrice: 188.4, closeyest: 214.31 },
  { ticker: 'MSFT', quantity: 4, avgPrice: 401.1, closeyest: 427.12 },
]

export const favorites: FavoriteRow[] = [
  { ticker: 'NVDA', name: 'NVIDIA', targetPrice: 950, closeyest: 901.48, changepct: 1.38 },
  { ticker: 'AMZN', name: 'Amazon', targetPrice: 210, closeyest: 192.12, changepct: -0.22 },
]

export const ideas: IdeaRow[] = [
  {
    portfolioName: 'AI Growth',
    ticker: 'NVDA',
    name: 'NVIDIA',
    virtualQty: 3,
    virtualEntryPrice: 880,
    closeyest: 901.48,
  },
  {
    portfolioName: 'Big Tech Core',
    ticker: 'AMZN',
    name: 'Amazon',
    virtualQty: 6,
    virtualEntryPrice: 185,
    closeyest: 192.12,
  },
]
