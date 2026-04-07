import type { GoogleUserProfile, SpreadsheetConnection } from '../../types/google'
import type {
  FavoritesSheetRow,
  HoldingsSheetRow,
  IdeasSheetRow,
  MonitorSheetRow,
  SpreadsheetSnapshot,
  StocksSheetRow,
} from '../../types/sheets'

const REQUIRED_TABS = ['Stocks', 'Holdings', 'Favorites', 'Ideas', 'Monitor'] as const

const TEMPLATE_HEADERS: Record<(typeof REQUIRED_TABS)[number], string[]> = {
  Stocks: ['ticker', 'name', 'market', 'active', 'memo'],
  Holdings: ['ticker', 'quantity', 'avg_price', 'memo'],
  Favorites: ['ticker', 'target_price', 'memo'],
  Ideas: ['portfolio_name', 'ticker', 'virtual_qty', 'virtual_entry_price', 'memo'],
  Monitor: ['ticker', 'full_ticker', 'closeyest', 'change', 'changepct', 'high52', 'low52', 'marketcap', 'pe', 'eps', 'volumeavg', 'tradetime'],
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

function mapRows<T>(
  values: string[][] | undefined,
  mapper: (record: Record<string, string>) => T,
) {
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load Google profile.')
  }

  return (await response.json()) as GoogleUserProfile
}

export async function fetchSpreadsheetConnection(
  spreadsheetId: string,
  accessToken: string,
) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties(title),sheets(properties(title))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

export async function fetchSpreadsheetSnapshot(
  spreadsheetId: string,
  accessToken: string,
) {
  const ranges = REQUIRED_TABS.map((tab) => `ranges=${encodeURIComponent(`${tab}!A:Z`)}`).join('&')
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
    stocks: mapRows<StocksSheetRow>(valueMap.get('Stocks'), (record) => ({
      ticker: record.ticker,
      name: record.name,
      market: record.market,
      active: record.active,
      memo: record.memo,
    })),
    holdings: mapRows<HoldingsSheetRow>(valueMap.get('Holdings'), (record) => ({
      ticker: record.ticker,
      quantity: toNumber(record.quantity),
      avg_price: toNumber(record.avg_price),
      memo: record.memo,
    })),
    favorites: mapRows<FavoritesSheetRow>(valueMap.get('Favorites'), (record) => ({
      ticker: record.ticker,
      target_price: toNumber(record.target_price),
      memo: record.memo,
    })),
    ideas: mapRows<IdeasSheetRow>(valueMap.get('Ideas'), (record) => ({
      portfolio_name: record.portfolio_name,
      ticker: record.ticker,
      virtual_qty: toNumber(record.virtual_qty),
      virtual_entry_price: toNumber(record.virtual_entry_price),
      memo: record.memo,
    })),
    monitor: mapRows<MonitorSheetRow>(valueMap.get('Monitor'), (record) => ({
      ticker: record.ticker,
      full_ticker: record.full_ticker,
      closeyest: toNumber(record.closeyest),
      change: toNumber(record.change),
      changepct: toNumber(record.changepct),
      high52: toNumber(record.high52),
      low52: toNumber(record.low52),
      marketcap: record.marketcap,
      pe: toNumber(record.pe),
      eps: toNumber(record.eps),
      volumeavg: toNumber(record.volumeavg),
      tradetime: record.tradetime,
    })),
  } satisfies SpreadsheetSnapshot
}

export async function createTemplateSpreadsheet(
  title: string,
  accessToken: string,
) {
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: REQUIRED_TABS.map((name) => ({ properties: { title: name } })),
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
  const data = REQUIRED_TABS.map((tab) => ({
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
    sheets: [...REQUIRED_TABS],
    isTemplateValid: true,
    checkedAt: new Date().toISOString(),
  } satisfies SpreadsheetConnection
}

export function getTemplateValidationMessage(connection: SpreadsheetConnection) {
  if (connection.isTemplateValid) {
    return 'Required tabs are available.'
  }

  const missing = REQUIRED_TABS.filter((required) => !connection.sheets.includes(required))
  return `Missing tabs: ${missing.join(', ')}`
}
