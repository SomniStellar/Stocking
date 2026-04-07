import { type FormEvent, useMemo, useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { buildHoldingRows, buildMonitorRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import type { TransactionDraft } from '../types/domain'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

const INITIAL_DRAFT: TransactionDraft = {
  date: todayIsoDate(),
  ticker: '',
  type: 'BUY',
  quantity: 0,
  price: 0,
  fee: 0,
  memo: '',
}

export function HoldingsPage() {
  const { addTransaction, busyState, errorMessage, snapshot, spreadsheet } = useGoogleWorkspace()
  const holdings = buildHoldingRows(snapshot)
  const monitorRows = buildMonitorRows(snapshot)
  const tickerOptions = useMemo(
    () => snapshot.stocks.map((row) => row.ticker).filter(Boolean).sort(),
    [snapshot.stocks],
  )
  const [draft, setDraft] = useState<TransactionDraft>(INITIAL_DRAFT)
  const [formMessage, setFormMessage] = useState<string | null>(null)

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

    if (draft.price <= 0) {
      setFormMessage('Price must be greater than 0.')
      return
    }

    const saved = await addTransaction({
      ...draft,
      ticker: normalizedTicker,
    })

    if (!saved) {
      return
    }

    setDraft({
      ...INITIAL_DRAFT,
      date: todayIsoDate(),
    })
    setFormMessage('Trade saved to the Transactions sheet.')
  }

  return (
    <div className="page-stack">
      <SectionCard title="Record Trade" description="Input buy and sell records here. Current holdings are calculated automatically from the Transactions sheet.">
        <form className="stack-block" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-compact">
            <label className="field-block" htmlFor="trade-date">
              <span>Date</span>
              <input
                id="trade-date"
                className="text-input"
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </label>

            <label className="field-block" htmlFor="trade-ticker">
              <span>Ticker</span>
              <input
                id="trade-ticker"
                className="text-input"
                list="stock-ticker-options"
                value={draft.ticker}
                onChange={(event) => setDraft((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))}
                placeholder="AAPL"
              />
              <datalist id="stock-ticker-options">
                {tickerOptions.map((ticker) => (
                  <option key={ticker} value={ticker} />
                ))}
              </datalist>
            </label>

            <label className="field-block" htmlFor="trade-type">
              <span>Type</span>
              <select
                id="trade-type"
                className="text-input"
                value={draft.type}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as 'BUY' | 'SELL' }))}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </label>

            <label className="field-block" htmlFor="trade-quantity">
              <span>Quantity</span>
              <input
                id="trade-quantity"
                className="text-input"
                type="number"
                min="0"
                step="0.0001"
                value={draft.quantity || ''}
                onChange={(event) => setDraft((current) => ({ ...current, quantity: Number(event.target.value) || 0 }))}
                placeholder="0.5000"
              />
            </label>

            <label className="field-block" htmlFor="trade-price">
              <span>Price</span>
              <input
                id="trade-price"
                className="text-input"
                type="number"
                min="0"
                step="0.0001"
                value={draft.price || ''}
                onChange={(event) => setDraft((current) => ({ ...current, price: Number(event.target.value) || 0 }))}
                placeholder="185.2500"
              />
            </label>

            <label className="field-block" htmlFor="trade-fee">
              <span>Fee</span>
              <input
                id="trade-fee"
                className="text-input"
                type="number"
                min="0"
                step="0.0001"
                value={draft.fee || ''}
                onChange={(event) => setDraft((current) => ({ ...current, fee: Number(event.target.value) || 0 }))}
                placeholder="0.00"
              />
            </label>
          </div>

          <label className="field-block" htmlFor="trade-memo">
            <span>Memo</span>
            <input
              id="trade-memo"
              className="text-input"
              value={draft.memo}
              onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))}
              placeholder="Optional note"
            />
          </label>

          <div className="button-row">
            <button className="primary-button" type="submit" disabled={!spreadsheet || busyState !== 'idle'}>
              {busyState === 'writing' ? 'Saving trade...' : 'Save trade'}
            </button>
          </div>

          <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
            {errorMessage ?? formMessage ?? 'Trades are written to the Transactions sheet. Holdings are recalculated after each save.'}
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Holdings" description="Current positions derived from buy and sell entries. Fractional quantities are supported.">
        <div className="data-table data-table-wide">
          <div className="table-head table-row table-row-holdings">
            <span>Ticker</span>
            <span>Qty</span>
            <span>Avg Price</span>
            <span>Close</span>
            <span>Invested</span>
            <span>Value</span>
            <span>Unrealized</span>
          </div>
          {holdings.length === 0 ? (
            <div className="empty-note">No active holdings yet. Record buy trades to build positions automatically.</div>
          ) : (
            holdings.map((item) => {
              const info = monitorRows.find((row) => row.ticker === item.ticker)
              return (
                <div key={item.ticker} className="table-row table-row-holdings">
                  <span>{item.ticker}</span>
                  <span>{item.quantity.toFixed(4)}</span>
                  <span>${item.avgPrice.toFixed(4)}</span>
                  <span>${item.closeyest.toFixed(2)}</span>
                  <span>${item.invested.toFixed(2)}</span>
                  <span>${item.marketValue.toFixed(2)}</span>
                  <span className={item.unrealizedProfit >= 0 ? 'text-positive' : 'text-negative'}>
                    ${item.unrealizedProfit.toFixed(2)} ({item.unrealizedReturn.toFixed(2)}%{info ? `, ${info.changepct.toFixed(2)}% vs prev` : ''})
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
