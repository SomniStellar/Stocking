const DEFAULT_PORTFOLIO_ACCENT_COLOR = '#f6a55b'

const BENCHMARK_ACCENT_FALLBACKS: Record<string, string> = {
  NASDAQ100: '#8dc6ff',
  SP500: '#78e0a5',
  DOW: '#ffd28a',
  KOSPI: '#ff8a80',
  KOSDAQ: '#74d7d1',
}

export const BENCHMARK_ACCENT_PALETTE = [
  '#f6a55b',
  '#8dc6ff',
  '#78e0a5',
  '#ffd28a',
  '#ff8a80',
  '#74d7d1',
  '#c9a7ff',
  '#ff9bd2',
  '#9ae66e',
  '#56c2ff',
  '#ffb86b',
  '#ff6f91',
  '#5eead4',
  '#b8c0ff',
  '#e8d17a',
  '#9b8cff',
] as const

export { DEFAULT_PORTFOLIO_ACCENT_COLOR }

export function getRecommendedBenchmarkAccentColor(benchmarkKey: string) {
  return BENCHMARK_ACCENT_FALLBACKS[benchmarkKey.trim().toUpperCase()] ?? '#8dc6ff'
}

export function normalizeAccentColor(color: string | undefined, benchmarkKey?: string) {
  const normalized = String(color ?? '').trim().toLowerCase()
  const matched = BENCHMARK_ACCENT_PALETTE.find((entry) => entry.toLowerCase() === normalized)

  if (matched) {
    return matched
  }

  if (benchmarkKey) {
    return getRecommendedBenchmarkAccentColor(benchmarkKey)
  }

  return DEFAULT_PORTFOLIO_ACCENT_COLOR
}
