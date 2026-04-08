import type { GoogleUserProfile, SpreadsheetConnection } from '../../types/google'
import type {
  CashSheetRow,
  HoldingsSheetRow,
  MonitorSheetRow,
  SpreadsheetSnapshot,
  WatchlistsSheetRow,
} from '../../types/sheets'

const REQUIRED_TABS = ['Holdings', 'Watchlists', 'Monitor', 'Cash'] as const
const SUPPORTED_TABS = [...REQUIRED_TABS] as const

const TEMPLATE_HEADERS: Record<(typeof SUPPORTED_TABS)[number], string[]> = {
  Holdings: ['ticker', 'name', 'quantity', 'avg_price', 'tags'],
  Watchlists: ['ticker', 'name', 'list_type', 'target_price', 'virtual_qty', 'virtual_entry_price', 'tags'],
  Monitor: ['ticker', 'full_ticker', 'closeyest', 'ytd_price', 'price_3y', 'price_5y', 'tradetime'],
  Cash: ['account_name', 'currency', 'amount', 'tags'],
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

function mapRows<T>(values: string[][] | undefined, mapper: (record: Record<string, string>) => T) {
  if (!values || values.length <= 1) {
    return [] as T[]
  }

  const headers = values[0]
  const rows = values.slice(1)
  const normalizedHeaders = headers.map((header) => normalizeText(header))

  return rows
    .filter((row) => row.some((cell) => normalizeText(cell) !== ''))
    .map((row) => {
      const record: Record<string, string> = {}
      normalizedHeaders.forEach((header, index) => {
        record[header] = normalizeText(row[index])
      })
      return mapper(record)
    })
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties(title),sheets(properties(title))`,
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
    sheets?: Array<{ properties?: { title?: string } }>
  }

  const sheets = (data.sheets ?? [])
    .map((entry) => entry.properties?.title?.trim())
    .filter((title): title is string => Boolean(title))

  const isTemplateValid = REQUIRED_TABS.every((required) => sheets.includes(required))

  return {
    id: data.spreadsheetId,
    title: data.properties?.title ?? 'Untitled spreadsheet',
    url: data.spreadsheetUrl ?? buildSpreadsheetUrl(data.spreadsheetId),
    sheets,
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
    holdings: mapRows<HoldingsSheetRow>(valueMap.get('Holdings'), (record) => ({
      ticker: record.ticker,
      name: record.name,
      quantity: toNumber(record.quantity),
      avg_price: toNumber(record.avg_price),
      tags: record.tags,
    })),
    watchlists: mapRows<WatchlistsSheetRow>(valueMap.get('Watchlists'), (record) => ({
      ticker: record.ticker,
      name: record.name,
      list_type: record.list_type,
      target_price: toNumber(record.target_price),
      virtual_qty: toNumber(record.virtual_qty),
      virtual_entry_price: toNumber(record.virtual_entry_price),
      tags: record.tags,
    })),
    cash: mapRows<CashSheetRow>(valueMap.get('Cash'), (record) => ({
      account_name: record.account_name,
      currency: record.currency,
      amount: toNumber(record.amount),
      tags: record.tags,
    })),
    monitor: mapRows<MonitorSheetRow>(valueMap.get('Monitor'), (record) => ({
      ticker: record.ticker,
      full_ticker: record.full_ticker,
      closeyest: toNumber(record.closeyest),
      ytd_price: toNumber(record.ytd_price),
      price_3y: toNumber(record.price_3y),
      price_5y: toNumber(record.price_5y),
      tradetime: record.tradetime,
    })),
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
  const data = SUPPORTED_TABS.map((tab) => ({
    range: `${tab}!A1:${String.fromCharCode(64 + TEMPLATE_HEADERS[tab].length)}1`,
    values: [TEMPLATE_HEADERS[tab]],
  }))

  const headersResponse = await fetch(
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

  if (!headersResponse.ok) {
    throw new Error('Spreadsheet was created, but template headers could not be written.')
  }

  return {
    id: spreadsheetId,
    title: created.properties?.title ?? title,
    url: created.spreadsheetUrl ?? buildSpreadsheetUrl(spreadsheetId),
    sheets: [...SUPPORTED_TABS],
    isTemplateValid: true,
    checkedAt: new Date().toISOString(),
  } satisfies SpreadsheetConnection
}

export async function appendHoldingRow(spreadsheetId: string, accessToken: string, row: HoldingsSheetRow) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Holdings!A:E')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[row.ticker, row.name, row.quantity, row.avg_price, row.tags]],
      }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to append holding row.')
  }
}

export function getTemplateValidationMessage(connection: SpreadsheetConnection) {
  if (connection.isTemplateValid) {
    return 'Required tabs are available.'
  }

  const missing = REQUIRED_TABS.filter((required) => !connection.sheets.includes(required))
  return `Missing tabs: ${missing.join(', ')}`
}