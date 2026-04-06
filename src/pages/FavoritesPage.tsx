import { SectionCard } from '../components/SectionCard'
import { favorites } from '../data/mockData'

export function FavoritesPage() {
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
          {favorites.map((item) => {
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
          })}
        </div>
      </SectionCard>
    </div>
  )
}
