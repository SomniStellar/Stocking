import type {
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
  const grouped = new Map<string, typeof snapshot.holdings>()

  snapshot.holdings.forEach((row) => {
    const key = row.ticker
    const current = grouped.get(key) ?? []
    current.push(row)
    grouped.set(key, current)
  })

  return [...grouped.entries()]
    .map(([ticker, rows]) => {
      const monitor = monitorMap.get(ticker)
      const firstRow = rows[0]
      const quantity = rows.reduce((sum, row) => {
        const sign = row.side === 'SELL' ? -1 : 1
        return sum + sign * toNumber(row.quantity)
      }, 0)
      const invested = rows.reduce((sum, row) => {
        const sign = row.side === 'SELL' ? -1 : 1
        return sum + sign * toNumber(row.quantity) * toNumber(row.avg_price)
      }, 0)
      const avgPrice = quantity === 0 ? 0 : invested / quantity
      const closeyest = toNumber(monitor?.closeyest)
      const ytdPrice = toNumber(monitor?.ytd_price)
      const price3Y = toNumber(monitor?.price_3y)
      const price5Y = toNumber(monitor?.price_5y)
      const marketValue = quantity * closeyest
      const unrealizedProfit = marketValue - invested
      const unrealizedReturn = invested === 0 ? 0 : (unrealizedProfit / invested) * 100
      const ytdReturn = ytdPrice === 0 ? 0 : ((closeyest - ytdPrice) / ytdPrice) * 100
      const return3Y = price3Y === 0 ? 0 : ((closeyest - price3Y) / price3Y) * 100
      const return5Y = price5Y === 0 ? 0 : ((closeyest - price5Y) / price5Y) * 100
      const mergedTags = [...new Set(rows.flatMap((row) => String(row.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)))].join(', ')
      const explicitOrder = rows
        .map((row) => toNumber(row.display_order))
        .filter((value) => value > 0)
      const displayOrder = explicitOrder.length > 0
        ? Math.min(...explicitOrder)
        : Math.min(...rows.map((row) => row.row_number))

      return {
        ticker,
        name: firstRow?.name || ticker,
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
        tags: mergedTags,
        displayOrder,
        sourceRowNumbers: rows.map((row) => row.row_number),
      }
    })
    .filter((row) => row.quantity > 0)
}

export function buildWatchlistRows(snapshot: SpreadsheetSnapshot): WatchlistRow[] {
  const monitorMap = new Map(snapshot.monitor.map((row) => [row.ticker, row]))

  return snapshot.watchlists.map((row) => ({
    rowNumber: row.row_number,
    ticker: row.ticker,
    name: row.name || row.ticker,
    listType: row.list_type || 'FAVORITE',
    targetPrice: toNumber(row.target_price),
    virtualQty: toNumber(row.virtual_qty),
    virtualEntryPrice: toNumber(row.virtual_entry_price),
    closeyest: toNumber(monitorMap.get(row.ticker)?.closeyest),
    tags: row.tags ?? '',
  }))
}