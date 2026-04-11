import type { BenchmarkDefinition, BenchmarkDraft } from '../../types/domain'

export const EMPTY_BENCHMARK_FORM = {
  benchmarkKey: '',
  name: '',
  tickerPrimary: '',
  tickerFallback: '',
}

export function toBenchmarkDrafts(rows: BenchmarkDefinition[]): BenchmarkDraft[] {
  return rows.map((row) => ({
    benchmarkKey: row.benchmarkKey,
    name: row.name,
    tickerPrimary: row.tickerPrimary,
    tickerFallback: row.tickerFallback,
    category: row.category || 'INDEX',
    market: row.market || 'US',
    isDefault: row.isDefault,
    isEnabled: row.isEnabled,
    displayOrder: row.displayOrder,
  }))
}

export function getNextBenchmarkDisplayOrder(drafts: BenchmarkDraft[]) {
  return drafts.reduce((maxOrder, row) => Math.max(maxOrder, row.displayOrder), 0) + 1
}

export function validateCustomBenchmarkInput(
  drafts: BenchmarkDraft[],
  benchmarkKey: string,
  tickerPrimary: string,
  editingBenchmarkKey: string | null,
) {
  const duplicateKey = drafts.find((row) => row.benchmarkKey === benchmarkKey && row.benchmarkKey !== editingBenchmarkKey)
  const duplicateTicker = drafts.find((row) => row.tickerPrimary === tickerPrimary && row.benchmarkKey !== editingBenchmarkKey)
  const nextCustomCount = editingBenchmarkKey
    ? drafts.filter((row) => !row.isDefault).length
    : drafts.filter((row) => !row.isDefault).length + 1

  return {
    duplicateKey: duplicateKey?.benchmarkKey ?? null,
    duplicateTicker: duplicateTicker?.tickerPrimary ?? null,
    customLimitExceeded: !editingBenchmarkKey && nextCustomCount > 3,
  }
}
