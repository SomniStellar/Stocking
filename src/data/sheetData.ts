import type {
  CashRow,
  HoldingRow,
  StockMonitorRow,
  WatchlistRow,
} from '../types/domain'
import type { SpreadsheetSnapshot } from '../types/sheets'

function toNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildMonitorRows(snapshot: SpreadsheetSnapshot): StockMonitorRow[] {
  return snapshot.monitor.map((row) => ({
    ticker: row.ticker,
    closeyest: toNumber(row.closeyest),
    ytdPrice: toNumber(row.ytd_price),
    price3Y: toNumber(row.price_3y),
    price5Y: toNumber(row.price_5y),
  }))
}

export function buildHoldingRows(snapshot: SpreadsheetSnapshot): HoldingRow[] {
  const monitorMap = new Map(snapshot.monitor.map((row) => [row.ticker, row]))

  return snapshot.holdings.map((row) => {
    const monitor = monitorMap.get(row.ticker)
    const quantity = toNumber(row.quantity)
    const avgPrice = toNumber(row.avg_price)
    const closeyest = toNumber(monitor?.closeyest)
    const ytdPrice = toNumber(monitor?.ytd_price)
    const price3Y = toNumber(monitor?.price_3y)
    const price5Y = toNumber(monitor?.price_5y)
    const invested = quantity * avgPrice
    const marketValue = quantity * closeyest
    const unrealizedProfit = marketValue - invested
    const unrealizedReturn = invested === 0 ? 0 : (unrealizedProfit / invested) * 100
    const ytdReturn = ytdPrice === 0 ? 0 : ((closeyest - ytdPrice) / ytdPrice) * 100
    const return3Y = price3Y === 0 ? 0 : ((closeyest - price3Y) / price3Y) * 100
    const return5Y = price5Y === 0 ? 0 : ((closeyest - price5Y) / price5Y) * 100

    return {
      ticker: row.ticker,
      name: row.name || row.ticker,
      quantity,
      avgPrice,
      closeyest,
      invested,
      marketValue,
      unrealizedProfit,
      unrealizedReturn,
      ytdReturn,
      return3Y,
      return5Y,
      tags: row.tags,
    }
  })
}

export function buildWatchlistRows(snapshot: SpreadsheetSnapshot): WatchlistRow[] {
  const monitorMap = new Map(snapshot.monitor.map((row) => [row.ticker, row]))

  return snapshot.watchlists.map((row) => ({
    ticker: row.ticker,
    name: row.name || row.ticker,
    listType: row.list_type || 'FAVORITE',
    targetPrice: toNumber(row.target_price),
    virtualQty: toNumber(row.virtual_qty),
    virtualEntryPrice: toNumber(row.virtual_entry_price),
    closeyest: toNumber(monitorMap.get(row.ticker)?.closeyest),
    tags: row.tags,
  }))
}

export function buildCashRows(snapshot: SpreadsheetSnapshot): CashRow[] {
  return snapshot.cash.map((row) => ({
    accountName: row.account_name,
    currency: row.currency || 'USD',
    amount: toNumber(row.amount),
    tags: row.tags,
  }))
}