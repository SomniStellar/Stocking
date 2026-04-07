import type {
  FavoriteRow,
  HoldingRow,
  IdeaRow,
  StockMonitorRow,
} from '../types/domain'
import type { SpreadsheetSnapshot } from '../types/sheets'

function toNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildMonitorRows(snapshot: SpreadsheetSnapshot): StockMonitorRow[] {
  const stockMap = new Map(
    snapshot.stocks.map((row) => [row.ticker, row.name || row.ticker]),
  )

  return snapshot.monitor.map((row) => ({
    ticker: row.ticker,
    name: stockMap.get(row.ticker) ?? row.ticker,
    closeyest: toNumber(row.closeyest),
    change: toNumber(row.change),
    changepct: toNumber(row.changepct),
    high52: toNumber(row.high52),
    low52: toNumber(row.low52),
    marketcap: row.marketcap || '-',
    pe: toNumber(row.pe),
    eps: toNumber(row.eps),
  }))
}

export function buildHoldingRows(snapshot: SpreadsheetSnapshot): HoldingRow[] {
  const closeMap = new Map(snapshot.monitor.map((row) => [row.ticker, toNumber(row.closeyest)]))

  return snapshot.holdings.map((row) => ({
    ticker: row.ticker,
    quantity: toNumber(row.quantity),
    avgPrice: toNumber(row.avg_price),
    closeyest: closeMap.get(row.ticker) ?? 0,
  }))
}

export function buildFavoriteRows(snapshot: SpreadsheetSnapshot): FavoriteRow[] {
  const stockMap = new Map(
    snapshot.stocks.map((row) => [row.ticker, row.name || row.ticker]),
  )
  const monitorMap = new Map(snapshot.monitor.map((row) => [row.ticker, row]))

  return snapshot.favorites.map((row) => {
    const monitor = monitorMap.get(row.ticker)
    return {
      ticker: row.ticker,
      name: stockMap.get(row.ticker) ?? row.ticker,
      targetPrice: toNumber(row.target_price),
      closeyest: toNumber(monitor?.closeyest),
      changepct: toNumber(monitor?.changepct),
    }
  })
}

export function buildIdeaRows(snapshot: SpreadsheetSnapshot): IdeaRow[] {
  const stockMap = new Map(
    snapshot.stocks.map((row) => [row.ticker, row.name || row.ticker]),
  )
  const closeMap = new Map(snapshot.monitor.map((row) => [row.ticker, toNumber(row.closeyest)]))

  return snapshot.ideas.map((row) => ({
    portfolioName: row.portfolio_name,
    ticker: row.ticker,
    name: stockMap.get(row.ticker) ?? row.ticker,
    virtualQty: toNumber(row.virtual_qty),
    virtualEntryPrice: toNumber(row.virtual_entry_price),
    closeyest: closeMap.get(row.ticker) ?? 0,
  }))
}
