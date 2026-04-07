interface GoogleTokenResponse {
  access_token: string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  callback: ((response: GoogleTokenResponse) => void) | null
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type: string }) => void
  }) => GoogleTokenClient
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOauth2
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts
    }
  }
}

let scriptPromise: Promise<void> | null = null

export function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity script.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity script.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export async function requestGoogleAccessToken(clientId: string) {
  await loadGoogleIdentityScript()

  return new Promise<string>((resolve, reject) => {
    const googleApi = window.google?.accounts?.oauth2

    if (!googleApi) {
      reject(new Error('Google Identity Services is not available.'))
      return
    }

    const tokenClient = googleApi.initTokenClient({
      client_id: clientId,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
      ].join(' '),
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(response.error_description ?? response.error ?? 'Google login failed.'),
          )
          return
        }

        resolve(response.access_token)
      },
      error_callback: () => {
        reject(new Error('Google login was interrupted.'))
      },
    })

    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}
