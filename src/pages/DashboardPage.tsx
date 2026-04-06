import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import { favorites, holdings, ideas, monitorRows } from '../data/mockData'

const totalInvested = holdings.reduce((sum, item) => sum + item.quantity * item.avgPrice, 0)
const totalValue = holdings.reduce((sum, item) => sum + item.quantity * item.closeyest, 0)
const totalProfit = totalValue - totalInvested
const totalYield = totalInvested === 0 ? 0 : (totalProfit / totalInvested) * 100

export function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Design-driven starter</p>
          <h1>Portfolio monitoring MVP</h1>
          <p className="hero-copy">
            This skeleton follows the approved v1 specification for US stocks,
            previous close pricing, favorites, and idea portfolios.
          </p>
        </div>
        <div className="hero-aside">
          <span>Data source</span>
          <strong>Google Sheets + GOOGLEFINANCE</strong>
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
            {monitorRows.map((row) => (
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
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Build Queue" description="What this starter is ready for next." actionLabel="Read docs">
          <ul className="check-list">
            <li>Google login and spreadsheet connection flow</li>
            <li>Sheet schema validation against v1 template</li>
            <li>CRUD forms for holdings, favorites, and ideas</li>
            <li>GOOGLEFINANCE-backed monitor sync and empty states</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
