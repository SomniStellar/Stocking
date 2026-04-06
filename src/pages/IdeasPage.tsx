import { SectionCard } from '../components/SectionCard'
import { ideas } from '../data/mockData'

export function IdeasPage() {
  return (
    <div className="page-stack">
      <SectionCard title="Idea Portfolios" description="Virtual baskets for non-held positions." actionLabel="Create portfolio">
        <div className="data-table">
          <div className="table-head table-row">
            <span>Portfolio</span>
            <span>Ticker</span>
            <span>Entry</span>
            <span>Close</span>
            <span>Return</span>
          </div>
          {ideas.map((item) => {
            const ratio = ((item.closeyest - item.virtualEntryPrice) / item.virtualEntryPrice) * 100
            return (
              <div key={`${item.portfolioName}-${item.ticker}`} className="table-row">
                <span>{item.portfolioName}</span>
                <span>{item.ticker}</span>
                <span>${item.virtualEntryPrice.toFixed(2)}</span>
                <span>${item.closeyest.toFixed(2)}</span>
                <span className={ratio >= 0 ? 'text-positive' : 'text-negative'}>
                  {ratio.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
