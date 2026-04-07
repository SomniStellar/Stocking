import type { GoogleUserProfile, SpreadsheetConnection } from '../../types/google'

const REQUIRED_TABS = ['Stocks', 'Holdings', 'Favorites', 'Ideas', 'Monitor']

export async function fetchGoogleUserProfile(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load Google profile.')
  }

  const data = (await response.json()) as GoogleUserProfile
  return data
}

export async function fetchSpreadsheetConnection(
  spreadsheetId: string,
  accessToken: string,
) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties(title),sheets(properties(title))`,
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
    sheets,
    isTemplateValid,
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
