import { SectionCard } from '../components/SectionCard'
import { holdings, monitorRows } from '../data/mockData'

export function HoldingsPage() {
  return (
    <div className="page-stack">
      <SectionCard title="Holdings" description="Actual positions with previous-close valuation." actionLabel="Add holding">
        <div className="data-table">
          <div className="table-head table-row">
            <span>Ticker</span>
            <span>Qty</span>
            <span>Avg Price</span>
            <span>Close</span>
            <span>P/L</span>
          </div>
          {holdings.map((item) => {
            const info = monitorRows.find((row) => row.ticker === item.ticker)
            const profit = (item.closeyest - item.avgPrice) * item.quantity
            return (
              <div key={item.ticker} className="table-row">
                <span>{item.ticker}</span>
                <span>{item.quantity}</span>
                <span>${item.avgPrice.toFixed(2)}</span>
                <span>${item.closeyest.toFixed(2)}</span>
                <span className={profit >= 0 ? 'text-positive' : 'text-negative'}>
                  ${profit.toFixed(2)} {info ? `(${info.changepct.toFixed(2)}%)` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
