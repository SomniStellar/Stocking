import { type FormEvent, useMemo, useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { buildHoldingRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import type { HoldingDraft, HoldingRow } from '../types/domain'

const INITIAL_DRAFT: HoldingDraft = {
  ticker: '',
  name: '',
  quantity: 0,
  avgPrice: 0,
  tags: '',
}

type HoldingSortKey = 'value' | 'ticker' | 'quantity' | 'profit' | 'return'

function sortHoldings(rows: HoldingRow[], sortKey: HoldingSortKey) {
  const sorted = [...rows]

  switch (sortKey) {
    case 'ticker':
      return sorted.sort((left, right) => left.ticker.localeCompare(right.ticker))
    case 'quantity':
      return sorted.sort((left, right) => right.quantity - left.quantity)
    case 'profit':
      return sorted.sort((left, right) => right.unrealizedProfit - left.unrealizedProfit)
    case 'return':
      return sorted.sort((left, right) => right.unrealizedReturn - left.unrealizedReturn)
    case 'value':
    default:
      return sorted.sort((left, right) => right.marketValue - left.marketValue)
  }
}

export function HoldingsPage() {
  const { addHolding, busyState, errorMessage, snapshot, spreadsheet } = useGoogleWorkspace()
  const holdings = buildHoldingRows(snapshot)
  const [draft, setDraft] = useState<HoldingDraft>(INITIAL_DRAFT)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [showHoldingForm, setShowHoldingForm] = useState(false)
  const [sortKey, setSortKey] = useState<HoldingSortKey>('value')

  const sortedHoldings = useMemo(() => sortHoldings(holdings, sortKey), [holdings, sortKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage(null)

    const normalizedTicker = draft.ticker.trim().toUpperCase()
    if (!normalizedTicker) {
      setFormMessage('Ticker is required.')
      return
    }

    if (draft.quantity <= 0) {
      setFormMessage('Quantity must be greater than 0.')
      return
    }

    if (draft.avgPrice <= 0) {
      setFormMessage('Average price must be greater than 0.')
      return
    }

    const saved = await addHolding({
      ...draft,
      ticker: normalizedTicker,
    })

    if (!saved) {
      return
    }

    setDraft(INITIAL_DRAFT)
    setFormMessage('Holding saved to the Holdings sheet.')
    setShowHoldingForm(false)
  }

  return (
    <div className="page-stack">
      <SectionCard title="Holdings" description="Current portfolio snapshot rows. Period returns are compared against the present holdings only.">
        <div className="stack-block">
          <div className="section-toolbar">
            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setFormMessage(null)
                  setShowHoldingForm((current) => !current)
                }}
              >
                {showHoldingForm ? 'Close input' : 'Add holding'}
              </button>
            </div>

            <label className="field-inline" htmlFor="holding-sort">
              <span>Sort by</span>
              <select
                id="holding-sort"
                className="text-input"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as HoldingSortKey)}
              >
                <option value="value">Market value</option>
                <option value="profit">Unrealized P/L</option>
                <option value="return">Return %</option>
                <option value="quantity">Quantity</option>
                <option value="ticker">Ticker</option>
              </select>
            </label>
          </div>

          {showHoldingForm ? (
            <form className="stack-block trade-form-panel" onSubmit={handleSubmit}>
              {!spreadsheet ? (
                <div className="message-box message-box-neutral">
                  Create or connect a spreadsheet in Settings before saving holdings.
                </div>
              ) : null}

              <div className="form-grid form-grid-compact">
                <label className="field-block" htmlFor="holding-ticker">
                  <span>Ticker</span>
                  <input
                    id="holding-ticker"
                    className="text-input"
                    value={draft.ticker}
                    onChange={(event) => setDraft((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))}
                    placeholder="AAPL"
                  />
                </label>

                <label className="field-block" htmlFor="holding-name">
                  <span>Name</span>
                  <input
                    id="holding-name"
                    className="text-input"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Apple Inc."
                  />
                </label>

                <label className="field-block" htmlFor="holding-quantity">
                  <span>Quantity</span>
                  <input
                    id="holding-quantity"
                    className="text-input"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={draft.quantity || ''}
                    onChange={(event) => setDraft((current) => ({ ...current, quantity: Number(event.target.value) || 0 }))}
                    placeholder="10.5000"
                  />
                </label>

                <label className="field-block" htmlFor="holding-avg-price">
                  <span>Average price</span>
                  <input
                    id="holding-avg-price"
                    className="text-input"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={draft.avgPrice || ''}
                    onChange={(event) => setDraft((current) => ({ ...current, avgPrice: Number(event.target.value) || 0 }))}
                    placeholder="185.2500"
                  />
                </label>
              </div>

              <label className="field-block" htmlFor="holding-tags">
                <span>Tags</span>
                <input
                  id="holding-tags"
                  className="text-input"
                  value={draft.tags}
                  onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="core, tech, retirement"
                />
              </label>

              <div className="button-row">
                <button className="primary-button" type="submit" disabled={!spreadsheet || busyState !== 'idle'}>
                  {busyState === 'writing' ? 'Saving holding...' : 'Save holding'}
                </button>
              </div>

              <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
                {errorMessage ?? formMessage ?? 'Holdings are stored as current portfolio snapshot rows.'}
              </div>
            </form>
          ) : null}

          <div className="data-table data-table-wide">
            <div className="table-head table-row table-row-holdings">
              <span>Ticker</span>
              <span>Qty</span>
              <span>Avg Price</span>
              <span>Close</span>
              <span>Value</span>
              <span>Unrealized</span>
              <span>Periods</span>
            </div>
            {sortedHoldings.length === 0 ? (
              <div className="empty-note">No active holdings yet. Add current positions to the Holdings sheet.</div>
            ) : (
              sortedHoldings.map((item) => (
                <div key={`${item.ticker}-${item.name}`} className="table-row table-row-holdings">
                  <span>{item.ticker}</span>
                  <span>{item.quantity.toFixed(4)}</span>
                  <span>${item.avgPrice.toFixed(4)}</span>
                  <span>${item.closeyest.toFixed(2)}</span>
                  <span>${item.marketValue.toFixed(2)}</span>
                  <span className={item.unrealizedProfit >= 0 ? 'text-positive' : 'text-negative'}>
                    ${item.unrealizedProfit.toFixed(2)} ({item.unrealizedReturn.toFixed(2)}%)
                  </span>
                  <span>
                    YTD {item.ytdReturn.toFixed(2)}% / 3Y {item.return3Y.toFixed(2)}% / 5Y {item.return5Y.toFixed(2)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}