import type {
  FavoriteRow,
  HoldingRow,
  IdeaRow,
  StockMonitorRow,
} from '../types/domain'
import type { SpreadsheetSnapshot, TransactionsSheetRow } from '../types/sheets'

function toNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortTransactions(rows: TransactionsSheetRow[]) {
  return [...rows].sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date)
    if (dateCompare !== 0) {
      return dateCompare
    }

    return left.ticker.localeCompare(right.ticker)
  })
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

  if (snapshot.transactions.length === 0) {
    return snapshot.holdings.map((row) => {
      const quantity = toNumber(row.quantity)
      const avgPrice = toNumber(row.avg_price)
      const closeyest = closeMap.get(row.ticker) ?? 0
      const invested = quantity * avgPrice
      const marketValue = quantity * closeyest
      const unrealizedProfit = marketValue - invested
      const unrealizedReturn = invested === 0 ? 0 : (unrealizedProfit / invested) * 100

      return {
        ticker: row.ticker,
        quantity,
        avgPrice,
        closeyest,
        invested,
        marketValue,
        unrealizedProfit,
        unrealizedReturn,
      }
    })
  }

  const holdingState = new Map<string, { quantity: number; costBasis: number }>()

  for (const row of sortTransactions(snapshot.transactions)) {
    const ticker = row.ticker.trim().toUpperCase()
    if (!ticker) {
      continue
    }

    const quantity = Math.max(0, toNumber(row.quantity))
    const price = Math.max(0, toNumber(row.price))
    const fee = Math.max(0, toNumber(row.fee))

    if (quantity <= 0) {
      continue
    }

    const current = holdingState.get(ticker) ?? { quantity: 0, costBasis: 0 }

    if (row.type === 'BUY') {
      current.quantity += quantity
      current.costBasis += quantity * price + fee
      holdingState.set(ticker, current)
      continue
    }

    if (row.type === 'SELL') {
      if (current.quantity <= 0) {
        holdingState.set(ticker, { quantity: 0, costBasis: 0 })
        continue
      }

      const sellQuantity = Math.min(quantity, current.quantity)
      const avgCost = current.quantity === 0 ? 0 : current.costBasis / current.quantity
      current.quantity -= sellQuantity
      current.costBasis -= avgCost * sellQuantity

      if (current.quantity <= 0.0000001) {
        holdingState.set(ticker, { quantity: 0, costBasis: 0 })
      } else {
        holdingState.set(ticker, current)
      }
    }
  }

  return [...holdingState.entries()]
    .filter(([, value]) => value.quantity > 0)
    .map(([ticker, value]) => {
      const closeyest = closeMap.get(ticker) ?? 0
      const invested = value.costBasis
      const avgPrice = value.quantity === 0 ? 0 : invested / value.quantity
      const marketValue = value.quantity * closeyest
      const unrealizedProfit = marketValue - invested
      const unrealizedReturn = invested === 0 ? 0 : (unrealizedProfit / invested) * 100

      return {
        ticker,
        quantity: value.quantity,
        avgPrice,
        closeyest,
        invested,
        marketValue,
        unrealizedProfit,
        unrealizedReturn,
      }
    })
    .sort((left, right) => right.marketValue - left.marketValue)
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
