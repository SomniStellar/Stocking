import type {
  BenchmarkComparisonCard,
  BenchmarkDefinition,
  ComparisonPeriod,
  DashboardComparisonChartPoint,
  DashboardRangeChartModel,
  DashboardSummaryMetrics,
} from '../types/domain'
import type { SpreadsheetSnapshot } from '../types/sheets'
import {
  buildBenchmarkComparisonCards,
  buildBenchmarkRows,
  calculatePortfolioPeriodPerformance,
  createComparisonPeriodLabel,
  validateBenchmarkRows,
} from './benchmarkData'
import { buildHoldingRows } from './sheetData'

const CHART_LINE_COLORS = ['#8dc6ff', '#78e0a5', '#ffd28a', '#ff8a80', '#c9a7ff', '#74d7d1']

interface DashboardComparisonViewModel {
  benchmarkRows: BenchmarkDefinition[]
  comparisonCards: BenchmarkComparisonCard[]
  portfolioReturn: number
  portfolioProfitAmount: number
  summary: DashboardSummaryMetrics
  benchmarkValidationCaption: string | null
  rangeChart: DashboardRangeChartModel
}

function createBenchmarkValidationCaption(validation: ReturnType<typeof validateBenchmarkRows>) {
  if (validation.duplicateKey) {
    return `Duplicate benchmark key: ${validation.duplicateKey}`
  }

  if (validation.duplicateTicker) {
    return `Duplicate ticker: ${validation.duplicateTicker}`
  }

  if (validation.invalidMarketKey) {
    return `Only US custom benchmarks are allowed: ${validation.invalidMarketKey}`
  }

  if (validation.customLimitExceeded) {
    return 'Up to 3 custom benchmarks are allowed.'
  }

  return null
}

function buildDashboardSummary(holdings: ReturnType<typeof buildHoldingRows>): DashboardSummaryMetrics {
  const totalInvested = holdings.reduce((sum, item) => sum + item.invested, 0)
  const totalValue = holdings.reduce((sum, item) => sum + item.marketValue, 0)
  const totalProfit = holdings.reduce((sum, item) => sum + item.unrealizedProfit, 0)
  const totalYield = totalInvested === 0 ? 0 : (totalProfit / totalInvested) * 100

  return {
    totalInvested,
    totalValue,
    totalProfit,
    totalYield,
  }
}

function buildChartLines(comparisonCards: BenchmarkComparisonCard[]) {
  const visibleBenchmarks = comparisonCards
    .filter((card) => card.isEnabled && card.isRenderable && card.status !== 'failed')
    .map((card, index) => ({
      benchmarkKey: card.benchmarkKey,
      name: card.name,
      color: CHART_LINE_COLORS[index % CHART_LINE_COLORS.length],
      isPortfolio: false,
    }))

  return [
    {
      benchmarkKey: 'portfolio',
      name: 'Portfolio',
      color: '#f6a55b',
      isPortfolio: true,
    },
    ...visibleBenchmarks,
  ]
}

function getSeriesSampleType(period: ComparisonPeriod) {
  return period === 'YTD' ? 'DAILY' : 'WEEKLY'
}

function getCalendarPeriodScope(period: ComparisonPeriod) {
  return period === 'YTD' ? 'YTD' : 'LONG'
}

function getRangeStartDate(period: ComparisonPeriod, latestPointDate: string) {
  const latest = new Date(latestPointDate)
  if (Number.isNaN(latest.getTime())) {
    return null
  }

  if (period === 'YTD') {
    return new Date(Date.UTC(latest.getUTCFullYear(), 0, 1))
  }

  const yearsBack = period === '3Y' ? 3 : 5
  return new Date(Date.UTC(latest.getUTCFullYear() - yearsBack, latest.getUTCMonth(), latest.getUTCDate()))
}

function formatChartDateLabel(pointDate: string, period: ComparisonPeriod) {
  const point = new Date(pointDate)
  if (Number.isNaN(point.getTime())) {
    return pointDate
  }

  if (period === 'YTD') {
    return point.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  }

  const year = String(point.getUTCFullYear()).slice(-2)
  const month = String(point.getUTCMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

function normalizeChartSeriesPoints(
  points: DashboardComparisonChartPoint[],
  lines: DashboardRangeChartModel['lines'],
) {
  const baseValues = new Map<string, number>()

  lines.forEach((line) => {
    const basePoint = points.find((point) => {
      const value = Number(point[line.benchmarkKey])
      return Number.isFinite(value) && value > 0
    })

    if (basePoint) {
      baseValues.set(line.benchmarkKey, Number(basePoint[line.benchmarkKey]))
    }
  })

  return points.map((point) => {
    const nextPoint: DashboardComparisonChartPoint = {
      pointDate: point.pointDate,
      label: point.label,
      portfolio: 0,
    }

    lines.forEach((line) => {
      const rawValue = Number(point[line.benchmarkKey])
      const baseValue = baseValues.get(line.benchmarkKey)

      if (!Number.isFinite(rawValue) || !baseValue || baseValue <= 0) {
        return
      }

      nextPoint[line.benchmarkKey] = ((rawValue / baseValue) - 1) * 100
    })

    nextPoint.portfolio = Number(nextPoint.portfolio ?? 0)
    return nextPoint
  })
}

function buildRangeChart(
  snapshot: SpreadsheetSnapshot,
  benchmarkRows: BenchmarkDefinition[],
  comparisonCards: BenchmarkComparisonCard[],
  period: ComparisonPeriod,
): DashboardRangeChartModel {
  const lines = buildChartLines(comparisonCards)
  const sampleType = getSeriesSampleType(period)
  const periodScope = getCalendarPeriodScope(period)
  const calendarRows = snapshot.seriesCalendar
    .filter((row) => row.calendar_type === sampleType && row.period_scope === periodScope)
    .sort((left, right) => left.point_date.localeCompare(right.point_date))

  const latestPointDate = calendarRows[calendarRows.length - 1]?.point_date ?? ''
  const rangeStartDate = latestPointDate ? getRangeStartDate(period, latestPointDate) : null
  const filteredCalendarRows = rangeStartDate
    ? calendarRows.filter((row) => {
      const point = new Date(row.point_date)
      return !Number.isNaN(point.getTime()) && point >= rangeStartDate
    })
    : []

  if (filteredCalendarRows.length === 0) {
    return {
      period,
      points: [],
      lines,
      hasData: false,
      emptyMessage: `No ${createComparisonPeriodLabel(period)} series data yet. Add SeriesCalendar and Series rows to render the chart.`,
    }
  }

  const benchmarkLookup = new Map(benchmarkRows.map((row) => [row.benchmarkKey, row]))
  const pointMap = new Map<string, DashboardComparisonChartPoint>(
    filteredCalendarRows.map((row) => [
      row.point_date,
      {
        pointDate: row.point_date,
        label: formatChartDateLabel(row.point_date, period),
        portfolio: 0,
      },
    ]),
  )

  snapshot.series
    .filter((row) => row.sample_type === sampleType && pointMap.has(row.point_date))
    .sort((left, right) => left.point_date.localeCompare(right.point_date))
    .forEach((row) => {
      const targetPoint = pointMap.get(row.point_date)
      if (!targetPoint) {
        return
      }

      if (row.series_type === 'portfolio') {
        targetPoint.portfolio = row.point_value
        return
      }

      const matchingLine = lines.find((line) => {
        if (line.isPortfolio) {
          return false
        }

        const benchmark = benchmarkLookup.get(line.benchmarkKey)
        const normalizedSeriesKey = row.series_key.trim().toUpperCase()
        const normalizedTicker = row.ticker.trim().toUpperCase()

        return normalizedSeriesKey === line.benchmarkKey
          || normalizedTicker === benchmark?.resolvedTicker
          || normalizedTicker === benchmark?.tickerPrimary
      })

      if (matchingLine) {
        targetPoint[matchingLine.benchmarkKey] = row.point_value
      }
    })

  const points = filteredCalendarRows
    .map((row) => pointMap.get(row.point_date))
    .filter((point): point is DashboardRangeChartModel['points'][number] => Boolean(point))

  const hasPortfolioData = points.some((point) => Number(point.portfolio) > 0)
  const normalizedPoints = normalizeChartSeriesPoints(points, lines)

  return {
    period,
    points: normalizedPoints,
    lines,
    hasData: hasPortfolioData,
    emptyMessage: hasPortfolioData
      ? ''
      : `No ${createComparisonPeriodLabel(period)} portfolio series data yet. Add Series rows to render the chart.`,
  }
}

export function buildDashboardComparisonViewModel(
  snapshot: SpreadsheetSnapshot,
  period: ComparisonPeriod,
): DashboardComparisonViewModel {
  const holdings = buildHoldingRows(snapshot)
  const benchmarkRows = buildBenchmarkRows(snapshot)
  const benchmarkValidation = validateBenchmarkRows(benchmarkRows)
  const comparisonCards = buildBenchmarkComparisonCards(snapshot, holdings, period)
  const portfolioPerformance = calculatePortfolioPeriodPerformance(holdings, period)
  const summary = buildDashboardSummary(holdings)
  const rangeChart = buildRangeChart(snapshot, benchmarkRows, comparisonCards, period)

  return {
    benchmarkRows,
    comparisonCards,
    portfolioReturn: portfolioPerformance.returnRate,
    portfolioProfitAmount: portfolioPerformance.profitAmount,
    summary,
    benchmarkValidationCaption: createBenchmarkValidationCaption(benchmarkValidation),
    rangeChart,
  }
}
