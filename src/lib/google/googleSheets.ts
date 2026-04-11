import type { GoogleUserProfile, SpreadsheetConnection } from '../../types/google'
import type {
  BenchmarksSheetRow,
  HoldingsSheetRow,
  MonitorSheetRow,
  SpreadsheetSnapshot,
  WatchlistsSheetRow,
} from '../../types/sheets'

const REQUIRED_TABS = ['Holdings', 'Watchlists', 'Monitor'] as const
const OPTIONAL_TABS = ['Benchmarks'] as const
const SUPPORTED_TABS = [...REQUIRED_TABS, ...OPTIONAL_TABS] as const

const TEMPLATE_HEADERS: Record<(typeof SUPPORTED_TABS)[number], string[]> = {
  Holdings: ['ticker', 'name', 'side', 'quantity', 'avg_price', 'tags', 'display_order'],
  Watchlists: ['ticker', 'name', 'list_type', 'target_price', 'virtual_qty', 'virtual_entry_price', 'tags'],
  Monitor: ['ticker', 'full_ticker', 'closeyest', 'ytd_price', 'price_1y', 'price_3y', 'price_5y', 'tradetime'],
  Benchmarks: ['benchmark_key', 'ticker_primary', 'ticker_fallback', 'resolved_ticker', 'resolved_source', 'status', 'market', 'name', 'category', 'is_default', 'is_enabled', 'display_order', 'retry_count'],
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function buildSpreadsheetUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`
}

function mapRows<T>(values: string[][] | undefined, mapper: (record: Record<string, string>, rowNumber: number) => T) {
  if (!values || values.length <= 1) {
    return [] as T[]
  }

  const headers = values[0]
  const rows = values.slice(1)
  const normalizedHeaders = headers.map((header) => normalizeText(header))

  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((cell) => normalizeText(cell) !== ''))
    .map(({ row, rowNumber }) => {
      const record: Record<string, string> = {}
      normalizedHeaders.forEach((header, index) => {
        record[header] = normalizeText(row[index])
      })
      return mapper(record, rowNumber)
    })
}

function buildMonitorFormulaRows(tickers: string[]) {
  return tickers.map((ticker, index) => {
    const row = index + 2
    const tickerRef = `A${row}`
    const fullTickerRef = `B${row}`

    return [
      ticker,
      `=IF(${tickerRef}="", "", ${tickerRef})`,
      `=IFERROR(GOOGLEFINANCE(${fullTickerRef},"closeyest"),"")`,
      `=IFERROR(INDEX(GOOGLEFINANCE(${fullTickerRef},"price",DATE(YEAR(TODAY()),1,1)),2,2),"")`,
      `=IFERROR(INDEX(GOOGLEFINANCE(${fullTickerRef},"price",EDATE(TODAY(),-12)),2,2),"")`,
      `=IFERROR(INDEX(GOOGLEFINANCE(${fullTickerRef},"price",EDATE(TODAY(),-36)),2,2),"")`,
      `=IFERROR(INDEX(GOOGLEFINANCE(${fullTickerRef},"price",EDATE(TODAY(),-60)),2,2),"")`,
      `=IFERROR(TEXT(GOOGLEFINANCE(${fullTickerRef},"tradetime"),"yyyy-mm-dd hh:mm"),"")`,
    ]
  })
}

function buildHoldingSheetValues(rows: HoldingsSheetRow[]) {
  return rows.map((row) => [
    row.ticker,
    row.name,
    row.side,
    row.quantity,
    row.avg_price,
    row.tags,
    row.display_order,
  ])
}

function buildBenchmarkSheetValues(rows: BenchmarksSheetRow[]) {
  return rows.map((row) => [
    row.benchmark_key,
    row.ticker_primary,
    row.ticker_fallback,
    row.resolved_ticker,
    row.resolved_source,
    row.status,
    row.market,
    row.name,
    row.category,
    row.is_default ? 'TRUE' : 'FALSE',
    row.is_enabled ? 'TRUE' : 'FALSE',
    row.display_order,
    row.retry_count,
  ])
}

export async function fetchGoogleUserProfile(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to load Google profile.')
  }

  return (await response.json()) as GoogleUserProfile
}

export async function fetchSpreadsheetConnection(spreadsheetId: string, accessToken: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties(title),sheets(properties(title,sheetId))`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to read spreadsheet metadata.')
  }

  const data = (await response.json()) as {
    spreadsheetId: string
    spreadsheetUrl?: string
    properties?: { title?: string }
    sheets?: Array<{ properties?: { title?: string; sheetId?: number } }>
  }

  const sheetEntries = (data.sheets ?? [])
    .map((entry) => ({
      title: entry.properties?.title?.trim() ?? '',
      sheetId: entry.properties?.sheetId ?? -1,
    }))
    .filter((entry) => Boolean(entry.title))

  const sheets = sheetEntries.map((entry) => entry.title)
  const sheetIds = Object.fromEntries(sheetEntries.map((entry) => [entry.title, entry.sheetId]))
  const isTemplateValid = REQUIRED_TABS.every((required) => sheets.includes(required))

  return {
    id: data.spreadsheetId,
    title: data.properties?.title ?? 'Untitled spreadsheet',
    url: data.spreadsheetUrl ?? buildSpreadsheetUrl(data.spreadsheetId),
    sheets,
    sheetIds,
    isTemplateValid,
    checkedAt: new Date().toISOString(),
  } satisfies SpreadsheetConnection
}

export async function fetchSpreadsheetSnapshot(spreadsheetId: string, accessToken: string, availableSheets?: string[]) {
  const targetTabs = (availableSheets && availableSheets.length > 0
    ? SUPPORTED_TABS.filter((tab) => availableSheets.includes(tab))
    : SUPPORTED_TABS) as string[]

  const ranges = targetTabs
    .map((tab) => `ranges=${encodeURIComponent(`${tab}!A:Z`)}`)
    .join('&')

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to load spreadsheet values.')
  }

  const data = (await response.json()) as {
    valueRanges?: Array<{ range?: string; values?: string[][] }>
  }

  const valueMap = new Map<string, string[][]>()
  for (const entry of data.valueRanges ?? []) {
    const sheetName = normalizeText(entry.range?.split('!')[0])
    if (sheetName) {
      valueMap.set(sheetName, entry.values ?? [])
    }
  }

  return {
    holdings: mapRows<HoldingsSheetRow>(valueMap.get('Holdings'), (record, rowNumber) => ({
      row_number: rowNumber,
      ticker: record.ticker,
      name: record.name,
      side: record.side === 'SELL' ? 'SELL' : 'BUY',
      quantity: toNumber(record.quantity),
      avg_price: toNumber(record.avg_price),
      tags: record.tags,
      display_order: toNumber(record.display_order),
    })),
    watchlists: mapRows<WatchlistsSheetRow>(valueMap.get('Watchlists'), (record, rowNumber) => ({
      row_number: rowNumber,
      ticker: record.ticker,
      name: record.name,
      list_type: record.list_type,
      target_price: toNumber(record.target_price),
      virtual_qty: toNumber(record.virtual_qty),
      virtual_entry_price: toNumber(record.virtual_entry_price),
      tags: record.tags,
    })),
    monitor: mapRows<MonitorSheetRow>(valueMap.get('Monitor'), (record) => ({
      ticker: record.ticker,
      full_ticker: record.full_ticker,
      closeyest: toNumber(record.closeyest),
      ytd_price: toNumber(record.ytd_price),
      price_1y: toNumber(record.price_1y),
      price_3y: toNumber(record.price_3y),
      price_5y: toNumber(record.price_5y),
      tradetime: record.tradetime,
    })),
    benchmarks: mapRows<BenchmarksSheetRow>(valueMap.get('Benchmarks'), (record) => ({
      benchmark_key: record.benchmark_key,
      ticker_primary: record.ticker_primary,
      ticker_fallback: record.ticker_fallback,
      resolved_ticker: record.resolved_ticker,
      resolved_source: record.resolved_source === 'fallback' ? 'fallback' : 'primary',
      status: record.status === 'retrying' || record.status === 'fallback' || record.status === 'failed' ? record.status : 'ready',
      market: record.market,
      name: record.name,
      category: record.category,
      is_default: ['true', '1', 'yes', 'y'].includes(normalizeText(record.is_default).toLowerCase()),
      is_enabled: ['true', '1', 'yes', 'y'].includes(normalizeText(record.is_enabled).toLowerCase()),
      display_order: toNumber(record.display_order),
      retry_count: toNumber(record.retry_count),
    })),
    seriesCalendar: [],
    series: [],
  } satisfies SpreadsheetSnapshot
}

export async function createTemplateSpreadsheet(title: string, accessToken: string) {
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: SUPPORTED_TABS.map((name) => ({ properties: { title: name } })),
    }),
  })

  if (!createResponse.ok) {
    throw new Error('Failed to create spreadsheet template.')
  }

  const created = (await createResponse.json()) as {
    spreadsheetId: string
    spreadsheetUrl?: string
    properties?: { title?: string }
  }

  const spreadsheetId = created.spreadsheetId
  const connection = await fetchSpreadsheetConnection(spreadsheetId, accessToken)
  await rewriteTemplateHeaders(spreadsheetId, accessToken, connection.sheets)

  return {
    ...connection,
    title: created.properties?.title ?? title,
    url: created.spreadsheetUrl ?? buildSpreadsheetUrl(spreadsheetId),
    isTemplateValid: true,
    checkedAt: new Date().toISOString(),
  } satisfies SpreadsheetConnection
}

export async function rewriteTemplateHeaders(spreadsheetId: string, accessToken: string, availableSheets?: string[]) {
  const sheets = availableSheets && availableSheets.length > 0
    ? availableSheets
    : (await fetchSpreadsheetConnection(spreadsheetId, accessToken)).sheets

  const targetTabs = SUPPORTED_TABS.filter((tab) => sheets.includes(tab)) as (typeof SUPPORTED_TABS)[number][]

  const data = targetTabs.map((tab) => ({
    range: `${tab}!A1:${String.fromCharCode(64 + TEMPLATE_HEADERS[tab].length)}1`,
    values: [TEMPLATE_HEADERS[tab]],
  }))

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to rewrite template headers.')
  }
}

export async function appendHoldingRow(spreadsheetId: string, accessToken: string, row: HoldingsSheetRow) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Holdings!A:G')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: buildHoldingSheetValues([row]) }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to append holding row.')
  }
}

export async function overwriteHoldingRows(spreadsheetId: string, accessToken: string, rows: HoldingsSheetRow[]) {
  await rewriteTemplateHeaders(spreadsheetId, accessToken)

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Holdings!A2:G')}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!clearResponse.ok) {
    throw new Error('Failed to clear existing holding rows.')
  }

  if (rows.length === 0) {
    return
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Holdings!A2:G${rows.length + 1}`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: buildHoldingSheetValues(rows) }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to rewrite holding rows.')
  }
}

export async function appendWatchlistRow(spreadsheetId: string, accessToken: string, row: WatchlistsSheetRow) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Watchlists!A:G')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[row.ticker, row.name, row.list_type, row.target_price, row.virtual_qty, row.virtual_entry_price, row.tags]],
      }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to append watchlist row.')
  }
}

export async function overwriteBenchmarkRows(
  spreadsheetId: string,
  accessToken: string,
  rows: BenchmarksSheetRow[],
  availableSheets?: string[],
) {
  const sheets = availableSheets && availableSheets.length > 0
    ? availableSheets
    : (await fetchSpreadsheetConnection(spreadsheetId, accessToken)).sheets

  if (!sheets.includes('Benchmarks')) {
    throw new Error('Connected spreadsheet is missing the Benchmarks tab.')
  }

  await rewriteTemplateHeaders(spreadsheetId, accessToken, sheets)

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Benchmarks!A2:M')}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!clearResponse.ok) {
    throw new Error('Failed to clear existing benchmark rows.')
  }

  if (rows.length === 0) {
    return
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Benchmarks!A2:M${rows.length + 1}`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: buildBenchmarkSheetValues(rows) }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to rewrite benchmark rows.')
  }
}

export async function deleteSheetRows(spreadsheetId: string, accessToken: string, sheetId: number, rowNumbers: number[]) {
  const uniqueRows = [...new Set(rowNumbers)].sort((left, right) => right - left)
  if (uniqueRows.length === 0) {
    return
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: uniqueRows.map((rowNumber) => ({
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        })),
      }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to delete sheet rows.')
  }
}

export async function resetSpreadsheetRows(spreadsheetId: string, accessToken: string, availableSheets?: string[]) {
  const sheets = availableSheets && availableSheets.length > 0
    ? availableSheets
    : (await fetchSpreadsheetConnection(spreadsheetId, accessToken)).sheets

  await rewriteTemplateHeaders(spreadsheetId, accessToken, sheets)

  const ranges = [
    'Holdings!A2:G',
    'Watchlists!A2:G',
    'Monitor!A2:H',
    ...(sheets.includes('Benchmarks') ? ['Benchmarks!A2:M'] : []),
  ]

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ranges }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to reset spreadsheet rows.')
  }
}
export async function syncMonitorSheet(spreadsheetId: string, accessToken: string, tickers: string[]) {
  const uniqueTickers = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))]

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Monitor!A2:H')}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!clearResponse.ok) {
    throw new Error('Failed to clear existing monitor rows.')
  }

  if (uniqueTickers.length === 0) {
    return
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Monitor!A2:H${uniqueTickers.length + 1}`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: buildMonitorFormulaRows(uniqueTickers) }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to sync monitor rows.')
  }
}

export function getTemplateValidationMessage(connection: SpreadsheetConnection) {
  if (connection.isTemplateValid) {
    return 'Required tabs are available.'
  }

  const missing = REQUIRED_TABS.filter((required) => !connection.sheets.includes(required))
  return `Missing tabs: ${missing.join(', ')}`
}














