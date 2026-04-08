import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import { buildCashRows, buildHoldingRows, buildMonitorRows, buildWatchlistRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function DashboardPage() {
  const { session, spreadsheet, envConfigured, snapshot } = useGoogleWorkspace()
  const monitorRows = buildMonitorRows(snapshot)
  const holdings = buildHoldingRows(snapshot)
  const watchlists = buildWatchlistRows(snapshot)
  const cashRows = buildCashRows(snapshot)

  const totalInvested = holdings.reduce((sum, item) => sum + item.invested, 0)
  const totalValue = holdings.reduce((sum, item) => sum + item.marketValue, 0)
  const totalProfit = holdings.reduce((sum, item) => sum + item.unrealizedProfit, 0)
  const totalYield = totalInvested === 0 ? 0 : (totalProfit / totalInvested) * 100
  const totalCash = cashRows.reduce((sum, item) => sum + item.amount, 0)
  const totalPortfolio = totalValue + totalCash

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Snapshot-driven workspace</p>
          <h1>Portfolio monitoring MVP</h1>
          <p className="hero-copy">
            Track current holdings, watchlists, and cash with Google Sheets as the single portfolio snapshot source.
          </p>
        </div>
        <div className="hero-aside hero-aside-stack">
          <span>Auth</span>
          <strong>{session ? session.profile.email : 'Not connected'}</strong>
          <span>Sheet</span>
          <strong>{spreadsheet ? spreadsheet.title : envConfigured ? 'Create your template in Settings' : 'Client ID required'}</strong>
        </div>
      </section>

      <section className="summary-grid">
        <SummaryCard title="Holdings Value" value={`$${totalValue.toFixed(2)}`} caption="Based on previous close" tone="neutral" />
        <SummaryCard title="Cash" value={`$${totalCash.toFixed(2)}`} caption="Cash rows loaded from sheet" tone="neutral" />
        <SummaryCard title="Portfolio Total" value={`$${totalPortfolio.toFixed(2)}`} caption="Holdings plus cash" tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`$${totalProfit.toFixed(2)}`} caption={`${totalYield.toFixed(2)}% return`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
      </section>

      <div className="content-grid">
        <SectionCard title="Current Holdings" description="Snapshot rows from the Holdings sheet.">
          <div className="mini-table">
            {holdings.length === 0 ? (
              <div className="empty-note">No holdings rows yet. Add current positions to the Holdings tab.</div>
            ) : (
              holdings.map((row) => (
                <div key={row.ticker} className="mini-row">
                  <div>
                    <strong>{row.ticker}</strong>
                    <span>{row.name}</span>
                  </div>
                  <div>
                    <strong>${row.marketValue.toFixed(2)}</strong>
                    <span className={row.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>
                      {row.unrealizedReturn.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Watchlist Coverage" description="Favorites and ideas are unified in the Watchlists sheet.">
          <ul className="check-list">
            <li>{watchlists.length} watchlist rows loaded</li>
            <li>{cashRows.length} cash rows loaded</li>
            <li>{monitorRows.length} monitor rows loaded</li>
            <li>{spreadsheet ? 'Template spreadsheet connected' : 'Template spreadsheet creation pending'}</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}