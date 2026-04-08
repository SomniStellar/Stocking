import { SectionCard } from '../components/SectionCard'
import { buildWatchlistRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function WatchlistsPage() {
  const { snapshot } = useGoogleWorkspace()
  const rows = buildWatchlistRows(snapshot)

  return (
    <div className="page-stack">
      <SectionCard title="Watchlists" description="Favorites and idea portfolios are unified in one sheet with list types.">
        <div className="data-table">
          <div className="table-head table-row">
            <span>Type</span>
            <span>Ticker</span>
            <span>Name</span>
            <span>Close</span>
            <span>Target / Entry</span>
          </div>
          {rows.length === 0 ? (
            <div className="empty-note">No watchlist rows yet. Add rows to the Watchlists tab.</div>
          ) : (
            rows.map((item) => {
              const comparison = item.listType === 'IDEA'
                ? `$${item.virtualEntryPrice.toFixed(2)}`
                : `$${item.targetPrice.toFixed(2)}`

              return (
                <div key={`${item.listType}-${item.ticker}-${item.name}`} className="table-row">
                  <span>{item.listType || 'FAVORITE'}</span>
                  <span>{item.ticker}</span>
                  <span>{item.name}</span>
                  <span>${item.closeyest.toFixed(2)}</span>
                  <span>{comparison}</span>
                </div>
              )
            })
          )}
        </div>
      </SectionCard>
    </div>
  )
}