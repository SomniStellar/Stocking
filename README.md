# Stocking

Stocking is a web app for monitoring a US stock portfolio with Google Sheets as the primary data store.

## Features

- US stocks focused workflow
- Previous-close based monitoring
- Google login and Google Sheets integration
- Template spreadsheet creation from the app
- In-app current position adjustment input
- Fractional quantity and decimal price support
- Portfolio summary and benchmark comparison dashboard
- Google Sheets based benchmark and chart sync

## Tech Stack

- React
- TypeScript
- Vite
- Codex
- Google Sheets API
- Google Identity Services

## Local Setup

1. Install dependencies.
2. Create `.env.local` from `.env.example`.
3. Set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth web client ID.
4. Run `npm run dev`.

## GitHub Pages Deploy

This repository is configured for GitHub Pages deployment through GitHub Actions.

### Repository setup

1. Push to the `main` branch.
2. In GitHub, open `Settings > Pages`.
3. Set the build source to `GitHub Actions`.
4. In `Settings > Secrets and variables > Actions`, add `VITE_GOOGLE_CLIENT_ID` as a repository secret.

The workflow file is [deploy.yml](E:/WorkSpace/Stocking/.github/workflows/deploy.yml:1).

### Production URL

- App URL: `https://somnistellar.github.io/Stocking/`
- Privacy policy URL: `https://somnistellar.github.io/Stocking/privacy.html`
- Support URL: `https://somnistellar.github.io/Stocking/support.html`

The Vite base path is already configured for this repository name in [vite.config.ts](E:/WorkSpace/Stocking/vite.config.ts:1).

## Google Cloud Setup

This app uses Google Identity Services and the Google Sheets API directly in the browser.

### Required setup

1. Create a Google Cloud project.
2. Enable the Google Sheets API.
3. Create an OAuth 2.0 Client ID for a web application.
4. Add this authorized JavaScript origin:
   - `https://somnistellar.github.io`
5. Configure the OAuth consent screen.
6. Add the scopes used by the app, including Google Sheets access.

### Current access model

The app requests Google account identity scopes and the Sheets scope in [src/lib/google/googleIdentity.ts](E:/WorkSpace/Stocking/src/lib/google/googleIdentity.ts:1).

## Small Rollout Guidance

For a small initial rollout, there are two realistic options:

### Option A: Testing mode

- Only users explicitly added as test users can sign in.
- Good for a closed pilot with known users.
- Bad for ad hoc sharing.

### Option B: External + In Production without verification

- New users can see the unverified app warning.
- Google applies a lifetime cap of 100 new users for apps showing the unverified warning.
- This is acceptable only for a controlled small rollout.

If you expect unknown users to keep joining over time, move to full OAuth verification before public sharing.

## Operational Checklist

- GitHub repository has Pages enabled with GitHub Actions.
- `VITE_GOOGLE_CLIENT_ID` is set in GitHub Actions secrets.
- Google Cloud OAuth consent screen is configured.
- Google Sheets API is enabled.
- Authorized JavaScript origin includes the GitHub Pages host.
- Privacy policy and app homepage are prepared before broader public release.
