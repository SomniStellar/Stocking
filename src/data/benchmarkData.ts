import type {
  BenchmarkComparisonCard,
  BenchmarkDefinition,
  BenchmarkResolvedSource,
  BenchmarkStatus,
  ComparisonPeriod,
  HoldingRow,
} from '../types/domain'
import type { SpreadsheetSnapshot } from '../types/sheets'

function toBoolean(value: boolean | string | number | undefined) {
  if (typeof value === 'boolean') {
    return value
  }

  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y'
}

function toNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeText(value: string | undefined) {
  return String(value ?? '').trim()
}

function normalizeResolvedSource(value: string | undefined): BenchmarkResolvedSource {
  return value === 'fallback' ? 'fallback' : 'primary'
}

function normalizeStatus(value: string | undefined): BenchmarkStatus {
  if (value === 'retrying' || value === 'fallback' || value === 'failed') {
    return value
  }

  return 'ready'
}

function getMonitorBasePrice(row: SpreadsheetSnapshot['monitor'][number] | undefined, period: ComparisonPeriod) {
  if (!row) {
    return 0
  }

  switch (period) {
    case 'YTD':
      return toNumber(row.ytd_price)
    case '1Y':
      return toNumber(row.price_1y)
    case '3Y':
      return toNumber(row.price_3y)
    case '5Y':
      return toNumber(row.price_5y)
  }
}

function getHoldingPeriodReturn(row: HoldingRow, period: ComparisonPeriod) {
  switch (period) {
    case 'YTD':
      return row.ytdReturn
    case '1Y':
      return row.return1Y
    case '3Y':
      return row.return3Y
    case '5Y':
      return row.return5Y
  }
}

export function calculatePortfolioPeriodReturn(holdings: HoldingRow[], period: ComparisonPeriod) {
  const totals = holdings.reduce(
    (sum, row) => {
      const currentValue = row.quantity * row.closeyest
      const periodReturn = getHoldingPeriodReturn(row, period)
      const multiplier = 1 + periodReturn / 100

      if (!Number.isFinite(multiplier) || multiplier <= 0 || currentValue <= 0) {
        return sum
      }

      const basePrice = row.closeyest / multiplier
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return sum
      }

      return {
        current: sum.current + currentValue,
        base: sum.base + row.quantity * basePrice,
      }
    },
    { current: 0, base: 0 },
  )

  if (totals.base <= 0) {
    return 0
  }

  return ((totals.current - totals.base) / totals.base) * 100
}

export function buildBenchmarkRows(snapshot: SpreadsheetSnapshot): BenchmarkDefinition[] {
  return snapshot.benchmarks
    .map((row) => ({
      benchmarkKey: normalizeText(row.benchmark_key),
      tickerPrimary: normalizeText(row.ticker_primary).toUpperCase(),
      tickerFallback: normalizeText(row.ticker_fallback).toUpperCase(),
      resolvedTicker: normalizeText(row.resolved_ticker).toUpperCase(),
      resolvedSource: normalizeResolvedSource(row.resolved_source),
      status: normalizeStatus(row.status),
      market: normalizeText(row.market).toUpperCase(),
      name: normalizeText(row.name),
      category: normalizeText(row.category),
      isDefault: toBoolean(row.is_default),
      isEnabled: toBoolean(row.is_enabled),
      displayOrder: toNumber(row.display_order),
      retryCount: toNumber(row.retry_count),
    }))
    .filter((row) => Boolean(row.benchmarkKey) && Boolean(row.tickerPrimary))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name))
}

export function validateBenchmarkRows(rows: BenchmarkDefinition[]) {
  const enabledRows = rows.filter((row) => row.isEnabled)
  const duplicateKey = enabledRows.find(
    (row, index) => enabledRows.findIndex((candidate) => candidate.benchmarkKey === row.benchmarkKey) !== index,
  )
  const duplicateTicker = enabledRows.find(
    (row, index) => enabledRows.findIndex((candidate) => candidate.tickerPrimary === row.tickerPrimary) !== index,
  )
  const customRows = enabledRows.filter((row) => !row.isDefault)
  const invalidMarketRow = customRows.find((row) => row.market && row.market !== 'US')

  return {
    duplicateKey: duplicateKey?.benchmarkKey ?? null,
    duplicateTicker: duplicateTicker?.tickerPrimary ?? null,
    customLimitExceeded: customRows.length > 3,
    invalidMarketKey: invalidMarketRow?.benchmarkKey ?? null,
  }
}

function evaluateRenderableBenchmarks(rows: BenchmarkDefinition[]) {
  const seenKeys = new Set<string>()
  const seenTickers = new Set<string>()
  let customCount = 0

  return rows.map((row) => {
    if (!row.isEnabled) {
      return {
        ...row,
        isRenderable: false,
        exclusionReason: '비교 비활성화',
      }
    }

    if (seenKeys.has(row.benchmarkKey)) {
      return {
        ...row,
        isRenderable: false,
        exclusionReason: '중복 benchmark key로 비교 제외',
      }
    }

    if (seenTickers.has(row.tickerPrimary)) {
      return {
        ...row,
        isRenderable: false,
        exclusionReason: '중복 티커로 비교 제외',
      }
    }

    if (!row.isDefault && row.market && row.market !== 'US') {
      return {
        ...row,
        isRenderable: false,
        exclusionReason: '미국 외 시장 custom 지표는 비교 제외',
      }
    }

    if (!row.isDefault) {
      customCount += 1
      if (customCount > 3) {
        return {
          ...row,
          isRenderable: false,
          exclusionReason: 'custom 지표 최대 3개 초과로 비교 제외',
        }
      }
    }

    seenKeys.add(row.benchmarkKey)
    seenTickers.add(row.tickerPrimary)

    return {
      ...row,
      isRenderable: true,
      exclusionReason: '',
    }
  })
}

export function createBenchmarkStatusCaption(
  name: string,
  status: BenchmarkStatus,
  resolvedSource: BenchmarkResolvedSource,
) {
  if (status === 'failed') {
    return `${name} 로드 실패: 비교에서 제외됨`
  }

  if (resolvedSource === 'fallback' || status === 'fallback') {
    return `${name} 대체 지표 사용 중`
  }

  if (status === 'retrying') {
    return `${name} 재시도 중`
  }

  return ''
}

export function createComparisonPeriodLabel(period: ComparisonPeriod) {
  switch (period) {
    case 'YTD':
      return 'YTD'
    case '1Y':
      return '1Y'
    case '3Y':
      return '3Y'
    case '5Y':
      return '5Y'
  }
}

export function buildBenchmarkComparisonCards(
  snapshot: SpreadsheetSnapshot,
  holdings: HoldingRow[],
  period: ComparisonPeriod,
): BenchmarkComparisonCard[] {
  const monitorMap = new Map(snapshot.monitor.map((row) => [row.ticker.trim().toUpperCase(), row]))
  const portfolioReturn = calculatePortfolioPeriodReturn(holdings, period)

  return evaluateRenderableBenchmarks(buildBenchmarkRows(snapshot))
    .map((row) => {
      const resolvedTicker = (row.resolvedTicker || row.tickerPrimary).trim().toUpperCase()
      const monitor = monitorMap.get(resolvedTicker)
      const currentPrice = toNumber(monitor?.closeyest)
      const basePrice = getMonitorBasePrice(monitor, period)
      const calculatedStatus = currentPrice > 0 && basePrice > 0 ? row.status : 'failed'
      const value = currentPrice > 0 && basePrice > 0
        ? ((currentPrice - basePrice) / basePrice) * 100
        : 0
      const caption = !row.isRenderable
        ? row.exclusionReason
        : createBenchmarkStatusCaption(row.name || resolvedTicker, calculatedStatus, row.resolvedSource)

      return {
        benchmarkKey: row.benchmarkKey,
        name: row.name || resolvedTicker,
        period,
        resolvedSource: row.resolvedSource,
        status: calculatedStatus,
        value,
        deltaFromPortfolio: portfolioReturn - value,
        caption,
        isEnabled: row.isEnabled,
        isRenderable: row.isRenderable,
        isDefault: row.isDefault,
      }
    })
}
