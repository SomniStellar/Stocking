import { SectionCard } from '../components/SectionCard'
import { buildCashRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

export function CashPage() {
  const { snapshot } = useGoogleWorkspace()
  const cashRows = buildCashRows(snapshot)
  const totalCash = cashRows.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="page-stack">
      <SectionCard title="Cash" description="Cash balances that can be included in portfolio total calculations.">
        <div className="stack-block">
          <div className="message-box message-box-neutral">Total cash: ${totalCash.toFixed(2)}</div>
          <div className="data-table">
            <div className="table-head table-row">
              <span>Account</span>
              <span>Currency</span>
              <span>Amount</span>
              <span>Tags</span>
              <span></span>
            </div>
            {cashRows.length === 0 ? (
              <div className="empty-note">No cash rows yet. Add rows to the Cash tab.</div>
            ) : (
              cashRows.map((item) => (
                <div key={`${item.accountName}-${item.currency}`} className="table-row">
                  <span>{item.accountName}</span>
                  <span>{item.currency}</span>
                  <span>${item.amount.toFixed(2)}</span>
                  <span>{item.tags || '-'}</span>
                  <span></span>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}