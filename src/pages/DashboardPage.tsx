import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import {
  buildFavoriteRows,
  buildHoldingRows,
  buildIdeaRows,
  buildMonitorRows,
} from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function DashboardPage() {
  const { session, spreadsheet, envConfigured, snapshot } = useGoogleWorkspace()
  const monitorRows = buildMonitorRows(snapshot)
  const holdings = buildHoldingRows(snapshot)
  const favorites = buildFavoriteRows(snapshot)
  const ideas = buildIdeaRows(snapshot)

  const totalInvested = holdings.reduce((sum, item) => sum + item.quantity * item.avgPrice, 0)
  const totalValue = holdings.reduce((sum, item) => sum + item.quantity * item.closeyest, 0)
  const totalProfit = totalValue - totalInvested
  const totalYield = totalInvested === 0 ? 0 : (totalProfit / totalInvested) * 100

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Design-driven starter</p>
          <h1>Portfolio monitoring MVP</h1>
          <p className="hero-copy">
            This starter now reads Google Sheet values and turns them into live
            dashboard summaries for the approved US stock monitoring flow.
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
        <SummaryCard title="Invested Capital" value={`$${totalInvested.toFixed(2)}`} caption="Average cost basis" tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`$${totalProfit.toFixed(2)}`} caption={`${totalYield.toFixed(2)}% return`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
        <SummaryCard title="Coverage" value={`${holdings.length + favorites.length + ideas.length}`} caption="Tracked rows across modules" tone="neutral" />
      </section>

      <div className="content-grid">
        <SectionCard title="Core Watchlist" description="Registered US stocks pulled into the monitor sheet." actionLabel="Manage universe">
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

        <SectionCard title="Connection Readiness" description="Implementation status for the next integration step." actionLabel="Open settings">
          <ul className="check-list">
            <li>{envConfigured ? 'Google client ID configured' : 'Google client ID still needs configuration'}</li>
            <li>{session ? 'Google sign-in flow connected' : 'Google sign-in pending'}</li>
            <li>{spreadsheet ? 'Template spreadsheet connected' : 'Template spreadsheet creation pending'}</li>
            <li>{monitorRows.length > 0 ? 'Real sheet rows loaded into the dashboard' : 'Populate sheet rows to see dashboard data'}</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
