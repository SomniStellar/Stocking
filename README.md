# Stocking

US stock monitoring web app starter built with `React + TypeScript + Vite`.

## Scope

- GitHub Pages deployment target
- Google Sheets as the primary data store
- GOOGLEFINANCE as the only market data source
- US stocks only
- Previous close based monitoring
- Holdings, favorites, and idea portfolios

## Current stage

- Title and login page added
- Browser-based Google login flow wired
- Existing spreadsheet connection flow prepared
- Real Google login still requires external Google Cloud setup

## Quick Google login setup

1. Create a Google Cloud project.
2. Enable `Google Sheets API`.
3. Configure the OAuth consent screen.
4. Create an OAuth client for a web application.
5. Add authorized JavaScript origins.
   - `http://127.0.0.1:4173`
   - `http://localhost:4173`
   - `https://somnistellar.github.io`
6. Create `.env.local` in the project root.

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

7. Restart the dev server.

## Run

```bash
npm install
npm run dev
npm run build
```

## Available docs

- `설계서/기능명세서_v1.md`
- `설계서/시트_템플릿_설계서_v1.md`
- `설계서/화면별_UI_명세서_v1.md`
- `설계서/Google_로그인_설정_가이드_v1.md`
