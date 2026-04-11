import { parseTags } from '../../lib/tags'
import type { HoldingDraft, HoldingRow } from '../../types/domain'

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export function formatQuantity(value: number) {
  const fixed = value.toFixed(6)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export function normalizeTags(value: string) {
  const unique = new Map<string, string>()

  parseTags(value).forEach((tag) => {
    const normalized = tag.toLowerCase()
    if (!unique.has(normalized)) {
      unique.set(normalized, normalized)
    }
  })

  return [...unique.values()].sort((left, right) => left.localeCompare(right)).join(', ')
}

export function buildHoldingDraft(row: HoldingRow): HoldingDraft {
  return {
    ticker: row.ticker,
    name: row.ticker,
    side: 'BUY',
    quantity: row.quantity,
    avgPrice: row.avgPrice,
    tags: row.tags,
  }
}
