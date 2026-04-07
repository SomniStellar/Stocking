import { SectionCard } from '../components/SectionCard'
import { buildHoldingRows, buildMonitorRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function HoldingsPage() {
  const { snapshot } = useGoogleWorkspace()
  const holdings = buildHoldingRows(snapshot)
  const monitorRows = buildMonitorRows(snapshot)

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
          {holdings.length === 0 ? (
            <div className="empty-note">No holdings rows yet. Add rows to the Holdings tab.</div>
          ) : (
            holdings.map((item) => {
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
            })
          )}
        </div>
      </SectionCard>
    </div>
  )
}
