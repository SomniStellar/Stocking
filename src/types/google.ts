export interface GoogleUserProfile {
  email: string
  name: string
  picture?: string
}

export interface SpreadsheetConnection {
  id: string
  title: string
  url: string
  sheets: string[]
  isTemplateValid: boolean
  checkedAt: string
}

export interface GoogleSession {
  accessToken: string
  profile: GoogleUserProfile
}
