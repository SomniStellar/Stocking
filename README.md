# Stocking

Stocking is a web app for monitoring a US stock portfolio with Google Sheets as the primary data store.

## For Users

Stocking is built for people who want to track a US stock portfolio in a browser while keeping the source data in their own Google Sheet.

### What you can do

- Sign in with Google
- Create a template spreadsheet from the app
- Connect an existing spreadsheet
- Adjust current positions in the app
- Review portfolio summary cards
- Compare portfolio performance against benchmarks

### Live site

- App: `https://somnistellar.github.io/Stocking/`
- Privacy policy: `https://somnistellar.github.io/Stocking/privacy.html`
- Support: `https://somnistellar.github.io/Stocking/support.html`

### What you need

- A Google account
- Access to Google Sheets
- A modern browser

### Important note

This app uses Google OAuth and Google Sheets access directly in the browser. During a small rollout, users may see an unverified app warning until full Google verification is completed.

## For Deployment Operators

This repository is configured for GitHub Pages deployment through GitHub Actions.

### GitHub setup

1. Push to the `main` branch.
2. In GitHub, open `Settings > Pages`.
3. Set the build source to `GitHub Actions`.
4. In `Settings > Secrets and variables > Actions`, add `VITE_GOOGLE_CLIENT_ID` as a repository secret.

Related files:

- Workflow: [.github/workflows/deploy.yml](./.github/workflows/deploy.yml)
- Vite base path: [vite.config.ts](./vite.config.ts)

### Google Cloud setup

1. Create a Google Cloud project.
2. Enable `Google Sheets API`.
3. Create an OAuth 2.0 Client ID for a web application.
4. Add this authorized JavaScript origin:
   - `https://somnistellar.github.io`
5. Configure the OAuth consent screen.
6. Add the scopes used by the app, including Google Sheets access.

The current Google sign-in and Sheets access flow is implemented in [src/lib/google/googleIdentity.ts](./src/lib/google/googleIdentity.ts).

### Small rollout options

#### Testing mode

- Only users explicitly added as test users can sign in
- Best for a closed pilot

#### External + In Production without verification

- New users can see the unverified app warning
- Google applies a lifetime cap of 100 new users for apps showing that warning
- Suitable only for a controlled small rollout

If broader public access is required, plan for full OAuth verification and a custom domain strategy.

### Deployment checklist

- GitHub Pages is enabled with `GitHub Actions`
- `VITE_GOOGLE_CLIENT_ID` is set in GitHub Actions secrets
- Google Sheets API is enabled
- OAuth consent screen is configured
- Authorized JavaScript origin includes the GitHub Pages host
- Privacy policy and support pages are published

## For Reusers And Developers

### Tech stack

- React
- TypeScript
- Vite
- React Router
- Recharts
- Google Identity Services
- Google Sheets API

### Local setup

1. Install Node.js 22 or a compatible current Node.js runtime.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` from `.env.example`.
4. Set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth web client ID.
5. Start the app:
   ```bash
   npm run dev
   ```
6. Open the local Vite URL shown in the terminal. The repo is configured for local preview on `127.0.0.1:4173`.

### Useful scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test:e2e`

### Project docs

- Product and setup documents: [docs/README.md](./docs/README.md)
