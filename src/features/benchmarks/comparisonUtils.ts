import type {
  BenchmarkDefinition,
  BenchmarkResolvedSource,
  BenchmarkStatus,
  ComparisonPeriod,
  SeriesCalendarEntry,
  SeriesPoint,
} from '../../types/domain'

const PERIOD_PRIORITY: ComparisonPeriod[] = ['YTD', '3Y', '5Y']

function toIsoDate(value: Date | string) {
  const point = typeof value === 'string' ? new Date(value) : value
  return point.toISOString().slice(0, 10)
}

function getPeriodStart(period: ComparisonPeriod, today = new Date()) {
  const point = new Date(today)

  switch (period) {
    case 'YTD':
      return new Date(point.getFullYear(), 0, 1)
    case '3Y':
      point.setFullYear(point.getFullYear() - 3)
      return point
    case '5Y':
      point.setFullYear(point.getFullYear() - 5)
      return point
  }
}

export function createDailyCalendarEntries(today = new Date()): SeriesCalendarEntry[] {
  const start = new Date(today.getFullYear(), 0, 1)
  const entries: SeriesCalendarEntry[] = []

  for (const point = new Date(start); point <= today; point.setDate(point.getDate() + 1)) {
    const day = point.getDay()
    if (day === 0 || day === 6) {
      continue
    }

    entries.push({
      calendarKey: `DAILY:${toIsoDate(point)}`,
      calendarType: 'DAILY',
      pointDate: toIsoDate(point),
      weekAnchor: '',
      periodScope: 'YTD',
    })
  }

  return entries
}

export function createWeeklyCalendarEntries(today = new Date()): SeriesCalendarEntry[] {
  const entries: SeriesCalendarEntry[] = []
  const cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 2) % 7))

  for (let index = 0; index < 260; index += 1) {
    const point = new Date(cursor)
    point.setDate(cursor.getDate() - index * 7)
    entries.push({
      calendarKey: `WEEKLY:${toIsoDate(point)}`,
      calendarType: 'WEEKLY',
      pointDate: toIsoDate(point),
      weekAnchor: 'FRIDAY',
      periodScope: 'LONG',
    })
  }

  return entries.reverse()
}

export function sliceSeriesForPeriod(points: SeriesPoint[], period: ComparisonPeriod, today = new Date()) {
  const start = getPeriodStart(period, today)
  const minDate = toIsoDate(start)
  return points.filter((point) => point.pointDate >= minDate)
}

export function findBasePoint(points: SeriesPoint[]) {
  return points.find((point) => Number.isFinite(point.pointValue) && point.pointValue > 0) ?? null
}

export function normalizeSeriesPoints(points: SeriesPoint[]) {
  const basePoint = findBasePoint(points)
  if (!basePoint) {
    return []
  }

  return points.map((point) => ({
    ...point,
    normalizedValue: (point.pointValue / basePoint.pointValue) * 100,
  }))
}

export function carryForwardSeriesPoints(
  calendar: SeriesCalendarEntry[],
  points: SeriesPoint[],
  maxGapDays: number,
) {
  const sortedPoints = [...points].sort((left, right) => left.pointDate.localeCompare(right.pointDate))
  let pointer = 0
  let lastPoint: SeriesPoint | null = null

  return calendar.flatMap((entry) => {
    while (pointer < sortedPoints.length && sortedPoints[pointer].pointDate <= entry.pointDate) {
      lastPoint = sortedPoints[pointer]
      pointer += 1
    }

    if (!lastPoint) {
      return []
    }

    const gapMs = new Date(entry.pointDate).getTime() - new Date(lastPoint.pointDate).getTime()
    const gapDays = gapMs / (1000 * 60 * 60 * 24)
    if (gapDays > maxGapDays) {
      return []
    }

    return [{ ...lastPoint, pointDate: entry.pointDate }]
  })
}

export function resolveBenchmarkTicker(benchmark: BenchmarkDefinition) {
  const resolvedTicker = benchmark.resolvedTicker.trim() || benchmark.tickerPrimary.trim()
  const resolvedSource: BenchmarkResolvedSource = benchmark.resolvedSource === 'fallback' ? 'fallback' : 'primary'

  return {
    resolvedTicker,
    resolvedSource,
  }
}

export function createRetryState(
  benchmark: BenchmarkDefinition,
  nextStatus: BenchmarkStatus,
  retryCount: number,
) {
  return {
    ...benchmark,
    status: nextStatus,
    retryCount,
  }
}

export function validateUserBenchmarkTickers(tickers: string[]) {
  const normalized = tickers
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean)

  const duplicateTicker = normalized.find((ticker, index) => normalized.indexOf(ticker) !== index)

  return {
    normalized,
    isLimitValid: normalized.length <= 3,
    duplicateTicker: duplicateTicker ?? null,
  }
}

export function sortPeriods(periods: ComparisonPeriod[]) {
  return [...periods].sort((left, right) => PERIOD_PRIORITY.indexOf(left) - PERIOD_PRIORITY.indexOf(right))
}
