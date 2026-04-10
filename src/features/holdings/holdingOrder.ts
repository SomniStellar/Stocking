import type { HoldingRow } from '../../types/domain'

export type HoldingDropPlacement = 'before' | 'after'

export function sortHoldingsByDisplayOrder(rows: HoldingRow[]) {
  return [...rows].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder
    }

    return left.ticker.localeCompare(right.ticker)
  })
}

export function getHoldingDropPlacement(pointerY: number, rect: Pick<DOMRect, 'top' | 'height'>): HoldingDropPlacement {
  const midpoint = rect.top + rect.height / 2
  return pointerY < midpoint ? 'before' : 'after'
}

export function buildReorderedTickerList(
  allTickers: string[],
  visibleTickers: string[],
  draggingTicker: string,
  targetTicker: string,
  placement: HoldingDropPlacement,
) {
  if (draggingTicker === targetTicker && placement === 'before') {
    return allTickers
  }

  const visibleSet = new Set(visibleTickers)
  const visibleOrder = allTickers.filter((ticker) => visibleSet.has(ticker))
  const draggingIndex = visibleOrder.indexOf(draggingTicker)
  const targetIndex = visibleOrder.indexOf(targetTicker)

  if (draggingIndex === -1 || targetIndex === -1) {
    return allTickers
  }

  const nextVisible = [...visibleOrder]
  nextVisible.splice(draggingIndex, 1)

  const targetIndexAfterRemoval = nextVisible.indexOf(targetTicker)
  if (targetIndexAfterRemoval === -1) {
    return allTickers
  }

  const insertIndex = placement === 'before' ? targetIndexAfterRemoval : targetIndexAfterRemoval + 1
  nextVisible.splice(insertIndex, 0, draggingTicker)

  let visiblePointer = 0
  return allTickers.map((ticker) => (
    visibleSet.has(ticker) ? nextVisible[visiblePointer++] : ticker
  ))
}