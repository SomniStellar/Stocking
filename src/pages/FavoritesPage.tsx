import { SectionCard } from '../components/SectionCard'
import { buildFavoriteRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function FavoritesPage() {
  const { snapshot } = useGoogleWorkspace()
  const favorites = buildFavoriteRows(snapshot)

  return (
    <div className="page-stack">
      <SectionCard title="Favorites" description="Watchlist rows with target-price monitoring." actionLabel="Add favorite">
        <div className="data-table">
          <div className="table-head table-row">
            <span>Ticker</span>
            <span>Name</span>
            <span>Close</span>
            <span>Target</span>
            <span>Gap</span>
          </div>
          {favorites.length === 0 ? (
            <div className="empty-note">No favorite rows yet. Add rows to the Favorites tab.</div>
          ) : (
            favorites.map((item) => {
              const gap = item.targetPrice - item.closeyest
              return (
                <div key={item.ticker} className="table-row">
                  <span>{item.ticker}</span>
                  <span>{item.name}</span>
                  <span>${item.closeyest.toFixed(2)}</span>
                  <span>${item.targetPrice.toFixed(2)}</span>
                  <span className={gap >= 0 ? 'text-positive' : 'text-negative'}>
                    ${gap.toFixed(2)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </SectionCard>
    </div>
  )
}
