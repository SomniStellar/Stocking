import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import {
  buildHoldingRows,
  buildMonitorRows,
} from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function DashboardPage() {
  const { session, spreadsheet, envConfigured, snapshot } = useGoogleWorkspace()
  const monitorRows = buildMonitorRows(snapshot)
  const holdings = buildHoldingRows(snapshot)

  const totalInvested = holdings.reduce((sum, item) => sum + item.invested, 0)
  const totalValue = holdings.reduce((sum, item) => sum + item.marketValue, 0)
  const totalProfit = holdings.reduce((sum, item) => sum + item.unrealizedProfit, 0)
  const totalYield = totalInvested === 0 ? 0 : (totalProfit / totalInvested) * 100

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Transaction-driven workspace</p>
          <h1>Portfolio monitoring MVP</h1>
          <p className="hero-copy">
            Record buy and sell trades, then let the app rebuild current holdings and previous-close summaries from your Google Sheet.
          </p>
        </div>
        <div className="hero-aside hero-aside-stack">
          <span>Auth</span>
          <strong>{session ? session.profile.email : 'Not connected'}</strong>
          <span>Sheet</span>
          <strong>
            {spreadsheet
              ? spreadsheet.title
              : envConfigured
                ? 'Create your template in Settings'
                : 'Client ID required'}
          </strong>
        </div>
      </section>

      <section className="summary-grid">
        <SummaryCard title="Portfolio Value" value={`$${totalValue.toFixed(2)}`} caption="Based on previous close" tone="neutral" />
        <SummaryCard title="Invested Capital" value={`$${totalInvested.toFixed(2)}`} caption="Open-position cost basis" tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`$${totalProfit.toFixed(2)}`} caption={`${totalYield.toFixed(2)}% return`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
        <SummaryCard title="Trades Loaded" value={`${snapshot.transactions.length}`} caption="Buy and sell rows in the sheet" tone="neutral" />
      </section>

      <div className="content-grid">
        <SectionCard title="Core Watchlist" description="Registered US stocks pulled into the monitor sheet.">
          <div className="mini-table">
            {monitorRows.length === 0 ? (
              <div className="empty-note">No monitor rows yet. Create the template and fill the sheet.</div>
            ) : (
              monitorRows.map((row) => (
                <div key={row.ticker} className="mini-row">
                  <div>
                    <strong>{row.ticker}</strong>
                    <span>{row.name}</span>
                  </div>
                  <div>
                    <strong>${row.closeyest.toFixed(2)}</strong>
                    <span className={row.changepct >= 0 ? 'text-positive' : 'text-negative'}>
                      {row.changepct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Connection Readiness" description="Implementation status for the next integration step.">
          <ul className="check-list">
            <li>{envConfigured ? 'Google client ID configured' : 'Google client ID still needs configuration'}</li>
            <li>{session ? 'Google sign-in flow connected' : 'Google sign-in pending'}</li>
            <li>{spreadsheet ? 'Template spreadsheet connected' : 'Template spreadsheet creation pending'}</li>
            <li>{snapshot.transactions.length > 0 ? 'Transaction rows loaded for derived holdings' : 'Add your first trade to activate derived holdings'}</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
