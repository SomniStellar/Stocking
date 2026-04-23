export type BenchmarkDropPlacement = 'before' | 'after'

export function getBenchmarkDropPlacement(pointerY: number, rect: Pick<DOMRect, 'top' | 'height'>): BenchmarkDropPlacement {
  const midpoint = rect.top + rect.height / 2
  return pointerY < midpoint ? 'before' : 'after'
}

export function buildReorderedBenchmarkKeys(
  benchmarkKeys: string[],
  draggingBenchmarkKey: string,
  targetBenchmarkKey: string,
  placement: BenchmarkDropPlacement,
) {
  if (draggingBenchmarkKey === targetBenchmarkKey && placement === 'before') {
    return benchmarkKeys
  }

  const draggingIndex = benchmarkKeys.indexOf(draggingBenchmarkKey)
  const targetIndex = benchmarkKeys.indexOf(targetBenchmarkKey)

  if (draggingIndex === -1 || targetIndex === -1) {
    return benchmarkKeys
  }

  const nextKeys = [...benchmarkKeys]
  nextKeys.splice(draggingIndex, 1)

  const nextTargetIndex = nextKeys.indexOf(targetBenchmarkKey)
  if (nextTargetIndex === -1) {
    return benchmarkKeys
  }

  const insertIndex = placement === 'before' ? nextTargetIndex : nextTargetIndex + 1
  nextKeys.splice(insertIndex, 0, draggingBenchmarkKey)
  return nextKeys
}
