import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { buildHoldingRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import { getTagOptions, matchesTagFilter, parseTags } from '../lib/tags'
import type { HoldingDraft, HoldingRow } from '../types/domain'

const INITIAL_DRAFT: HoldingDraft = {
  ticker: '',
  name: '',
  side: 'BUY',
  quantity: 0,
  avgPrice: 0,
  tags: '',
}

type HoldingSortKey = 'value' | 'ticker' | 'quantity' | 'profit' | 'return'
type CostInputMode = 'avg' | 'total'

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatQuantity(value: number) {
  const fixed = value.toFixed(6)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

function normalizeTags(value: string) {
  return parseTags(value).sort((left, right) => left.localeCompare(right)).join(', ')
}

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

function buildHoldingDraft(row: HoldingRow): HoldingDraft {
  return {
    ticker: row.ticker,
    name: row.ticker,
    side: 'BUY',
    quantity: row.quantity,
    avgPrice: row.avgPrice,
    tags: row.tags,
  }
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="currentColor" />
      <path d="m14 6 4 4 2-2-4-4-2 2Z" fill="currentColor" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h8l1 2h4v2H3V6h4l1-2Z" fill="currentColor" />
      <path d="M6 9h12l-1 11H7L6 9Z" fill="currentColor" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z" fill="currentColor" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5a7 7 0 1 1-6.58 9.4l1.9-.63A5 5 0 1 0 8.5 8.5H12V6H5v7h2V9.77A7 7 0 0 1 12 5Z" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function HoldingsPage() {
  const { addHolding, busyState, deleteHolding, errorMessage, snapshot, spreadsheet, updateHolding } = useGoogleWorkspace()
  const holdings = buildHoldingRows(snapshot)
  const [draft, setDraft] = useState<HoldingDraft>(INITIAL_DRAFT)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [showHoldingForm, setShowHoldingForm] = useState(false)
  const [sortKey, setSortKey] = useState<HoldingSortKey>('value')
  const [activeTag, setActiveTag] = useState('all')
  const [costInputMode, setCostInputMode] = useState<CostInputMode>('avg')
  const [costInput, setCostInput] = useState(0)
  const [editingTicker, setEditingTicker] = useState<string | null>(null)
  const [highlightedTicker, setHighlightedTicker] = useState<string | null>(null)

  const tagOptions = useMemo(() => getTagOptions(holdings.map((item) => item.tags)), [holdings])
  const filteredHoldings = useMemo(
    () => holdings.filter((item) => matchesTagFilter(item.tags, activeTag)),
    [activeTag, holdings],
  )
  const sortedHoldings = useMemo(() => sortHoldings(filteredHoldings, sortKey), [filteredHoldings, sortKey])

  const summary = useMemo(() => {
    const positions = filteredHoldings.length
    const marketValue = filteredHoldings.reduce((sum, item) => sum + item.marketValue, 0)
    const invested = filteredHoldings.reduce((sum, item) => sum + item.invested, 0)
    const unrealized = filteredHoldings.reduce((sum, item) => sum + item.unrealizedProfit, 0)
    const unrealizedReturn = invested > 0 ? (unrealized / invested) * 100 : 0
    const weightedBase = marketValue > 0 ? marketValue : 1
    const ytd = filteredHoldings.reduce((sum, item) => sum + item.marketValue * item.ytdReturn, 0) / weightedBase
    const threeYear = filteredHoldings.reduce((sum, item) => sum + item.marketValue * item.return3Y, 0) / weightedBase
    const fiveYear = filteredHoldings.reduce((sum, item) => sum + item.marketValue * item.return5Y, 0) / weightedBase

    return { positions, marketValue, invested, unrealized, unrealizedReturn, ytd, threeYear, fiveYear }
  }, [filteredHoldings])

  const previewTags = parseTags(draft.tags).sort((left, right) => left.localeCompare(right))

  useEffect(() => {
    if (!highlightedTicker) {
      return
    }

    const timer = window.setTimeout(() => {
      setHighlightedTicker(null)
    }, 1600)

    return () => window.clearTimeout(timer)
  }, [highlightedTicker])

  function resetDraft() {
    setDraft(INITIAL_DRAFT)
    setCostInputMode('avg')
    setCostInput(0)
    setFormMessage(null)
  }

  function openCreateForm() {
    setEditingTicker(null)
    resetDraft()
    setShowHoldingForm(true)
  }

  function openEditForm(row: HoldingRow) {
    const nextDraft = buildHoldingDraft(row)
    setEditingTicker(row.ticker)
    setDraft(nextDraft)
    setCostInputMode('avg')
    setCostInput(row.avgPrice)
    setFormMessage(null)
    setShowHoldingForm(false)
  }

  function closeInlineEdit() {
    setEditingTicker(null)
    resetDraft()
  }

  function closeCreateForm() {
    setShowHoldingForm(false)
    resetDraft()
  }

  function toggleSide() {
    setDraft((current) => ({ ...current, side: current.side === 'BUY' ? 'SELL' : 'BUY' }))
  }

  function toggleCostMode() {
    setCostInputMode((current) => current === 'avg' ? 'total' : 'avg')
    setFormMessage(null)
  }

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
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

    if (costInput <= 0) {
      setFormMessage(costInputMode === 'total' ? 'Total cost must be greater than 0.' : 'Average price must be greater than 0.')
      return
    }

    const avgPrice = costInputMode === 'total' ? costInput / draft.quantity : costInput
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      setFormMessage('Average price could not be calculated from the current inputs.')
      return
    }

    const normalizedDraft: HoldingDraft = {
      ...draft,
      ticker: normalizedTicker,
      name: normalizedTicker,
      avgPrice,
      tags: normalizeTags(draft.tags),
    }

    const saved = editingTicker
      ? await updateHolding(editingTicker, normalizedDraft)
      : await addHolding(normalizedDraft)

    if (!saved) {
      return
    }

    setFormMessage(editingTicker ? `${normalizedTicker} holding was updated.` : `${draft.side} row saved to the Holdings sheet.`)
    setHighlightedTicker(normalizedTicker)

    if (editingTicker) {
      closeInlineEdit()
    } else {
      closeCreateForm()
    }
  }

  async function handleDelete(ticker: string) {
    setFormMessage(null)
    const deleted = await deleteHolding(ticker)
    if (deleted) {
      setFormMessage(`${ticker} rows were removed from the Holdings sheet.`)
    }
  }

  function renderEditorCard(mode: 'create' | 'edit', itemKey?: string) {
    const isEditing = mode === 'edit'

    return (
      <form key={itemKey ?? mode} className="entity-card entity-card-form entity-card-highlight" onSubmit={submitDraft}>
        <div className="entity-card-topline">
          <div className="tag-chip-row">
            {previewTags.map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
          <div className="card-icon-actions">
            <button className="icon-button" type="button" onClick={resetDraft} aria-label="Reset draft">
              <ResetIcon />
            </button>
            <button className="icon-button" type="button" onClick={isEditing ? closeInlineEdit : closeCreateForm} aria-label="Close input">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="metric-grid holdings-metric-grid">
          <div className="metric-card metric-card-ticker-input">
            <span>Ticker</span>
            <input
              id={`${mode}-holding-ticker`}
              className="text-input"
              value={draft.ticker}
              onChange={(event) => setDraft((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))}
              placeholder="AAPL"
            />
          </div>

          <div className="metric-card metric-card-input">
            <div className="field-label-inline field-label-inline-clickable" onClick={toggleCostMode} role="button" tabIndex={0} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggleCostMode()
              }
            }}>
              <span>{costInputMode === 'avg' ? 'Average Price' : 'Total Price'}</span>
            </div>
            <input
              className="text-input"
              type="number"
              min="0"
              step="0.000001"
              value={costInput || ''}
              onChange={(event) => setCostInput(Number(event.target.value) || 0)}
              placeholder={costInputMode === 'avg' ? '185.25' : '1945.13'}
            />
          </div>

          <div className="metric-card metric-card-toggle">
            <span>Side</span>
            <button
              className={`toggle-button toggle-button-side ${draft.side === 'BUY' ? 'toggle-button-buy' : 'toggle-button-sell'}`}
              type="button"
              onClick={toggleSide}
            >
              {draft.side}
            </button>
          </div>

          <div className="metric-card metric-card-input">
            <span>Quantity</span>
            <input
              id={`${mode}-holding-quantity`}
              className="text-input"
              type="number"
              min="0"
              step="0.000001"
              value={draft.quantity || ''}
              onChange={(event) => setDraft((current) => ({ ...current, quantity: Number(event.target.value) || 0 }))}
              placeholder="10.500000"
            />
          </div>

          <div className="metric-card metric-card-input">
            <span>Tags</span>
            <input
              id={`${mode}-holding-tags`}
              className="text-input"
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="core, tech"
            />
          </div>

          <div className="metric-card metric-card-actions">
            <span>{isEditing ? 'Edit' : 'Create'}</span>
            <button className="primary-button" type="submit" disabled={!spreadsheet || busyState !== 'idle'}>
              {busyState === 'writing' ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    )
  }

  function renderHoldingCard(item: HoldingRow) {
    const sortedTags = parseTags(item.tags).sort((left, right) => left.localeCompare(right))

    return (
      <article key={`${item.ticker}-${item.name}`} className={`entity-card${highlightedTicker === item.ticker ? ' entity-card-highlight' : ''}`} data-item-id={item.ticker}>
        <div className="entity-card-topline">
          <div className="tag-chip-row">
            {sortedTags.map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
          <div className="card-icon-actions">
            <button className="icon-button" type="button" onClick={() => openEditForm(item)} disabled={busyState !== 'idle'} aria-label={`Edit ${item.ticker}`}>
              <EditIcon />
            </button>
            <button className="icon-button" type="button" onClick={() => { void handleDelete(item.ticker) }} disabled={busyState !== 'idle'} aria-label={`Delete ${item.ticker}`}>
              <DeleteIcon />
            </button>
          </div>
        </div>

        <div className="metric-grid holdings-metric-grid">
          <div className="metric-card metric-card-ticker-display">
            <strong>{item.name || item.ticker}</strong>
            <small>{item.ticker}</small>
          </div>
          <div className="metric-card">
            <span>Price / Avg</span>
            <strong>{formatCurrency(item.closeyest)}</strong>
            <small>{formatCurrency(item.avgPrice)}</small>
          </div>
          <div className="metric-card">
            <span>P/L</span>
            <strong className={item.unrealizedProfit >= 0 ? 'text-positive' : 'text-negative'}>
              {formatCurrency(item.unrealizedProfit)}
            </strong>
            <small className={item.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>
              {formatPercent(item.unrealizedReturn)}
            </small>
          </div>
          <div className="metric-card">
            <span>Quantity</span>
            <strong>{formatQuantity(item.quantity)}</strong>
          </div>
          <div className="metric-card">
            <span>Value / Invested</span>
            <strong>{formatCurrency(item.marketValue)}</strong>
            <small>{formatCurrency(item.invested)}</small>
          </div>
          <div className="metric-card metric-card-period-list">
            <div className="metric-period-line"><span>YTD</span><strong className={item.ytdReturn >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(item.ytdReturn)}</strong></div>
            <div className="metric-period-line"><span>3Y</span><strong className={item.return3Y >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(item.return3Y)}</strong></div>
            <div className="metric-period-line"><span>5Y</span><strong className={item.return5Y >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(item.return5Y)}</strong></div>
          </div>
        </div>
      </article>
    )
  }

  function renderSummaryCard() {
    return (
      <article className="entity-card entity-card-summary" data-item-id="portfolio-summary">
        <div className="entity-card-topline">
          <div className="tag-chip-row">
            <span className="tag-chip tag-chip-total">Total</span>
          </div>
        </div>

        <div className="metric-grid holdings-metric-grid">
          <div className="metric-card metric-card-ticker-display">
            <strong>Portfolio</strong>
          </div>
          <div className="metric-card">
            <span>Value</span>
            <strong>{formatCurrency(summary.marketValue)}</strong>
          </div>
          <div className="metric-card">
            <span>P/L</span>
            <strong className={summary.unrealized >= 0 ? 'text-positive' : 'text-negative'}>{formatCurrency(summary.unrealized)}</strong>
            <small className={summary.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(summary.unrealizedReturn)}</small>
          </div>
          <div className="metric-card">
            <span>Holdings</span>
            <strong>{summary.positions}</strong>
          </div>
          <div className="metric-card">
            <span>Invested</span>
            <strong>{formatCurrency(summary.invested)}</strong>
          </div>
          <div className="metric-card metric-card-period-list">
            <div className="metric-period-line"><span>YTD</span><strong className={summary.ytd >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(summary.ytd)}</strong></div>
            <div className="metric-period-line"><span>3Y</span><strong className={summary.threeYear >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(summary.threeYear)}</strong></div>
            <div className="metric-period-line"><span>5Y</span><strong className={summary.fiveYear >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(summary.fiveYear)}</strong></div>
          </div>
        </div>
      </article>
    )
  }

  function renderAddSlotCard() {
    return (
      <article className="entity-card entity-card-add-slot" data-item-id="holding-add-slot" onClick={openCreateForm} role="button" tabIndex={0} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openCreateForm()
        }
      }}>
        <AddIcon />
      </article>
    )
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Holdings"
        description="Current portfolio snapshot rows. BUY rows add to the position, SELL rows reduce it."
      >
        <div className="stack-block">
          <div className="section-toolbar">
            <label className="field-inline" htmlFor="holding-sort">
              <span>Sort</span>
              <select id="holding-sort" className="text-input" value={sortKey} onChange={(event) => setSortKey(event.target.value as HoldingSortKey)}>
                <option value="value">Value</option>
                <option value="profit">P/L</option>
                <option value="return">Return</option>
                <option value="quantity">Quantity</option>
                <option value="ticker">Ticker</option>
              </select>
            </label>

            <label className="field-inline" htmlFor="holding-tag-filter">
              <span>Tag</span>
              <select id="holding-tag-filter" className="text-input" value={activeTag} onChange={(event) => setActiveTag(event.target.value)}>
                <option value="all">All</option>
                {tagOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!spreadsheet && (showHoldingForm || editingTicker) ? (
            <div className="message-box message-box-neutral">
              Create or connect a spreadsheet in Settings before saving holdings.
            </div>
          ) : null}

          <div className="entity-card-grid entity-card-grid-holdings">
            {renderSummaryCard()}
            {showHoldingForm ? renderEditorCard('create') : renderAddSlotCard()}
            {sortedHoldings.map((item) => (
              editingTicker === item.ticker ? renderEditorCard('edit', item.ticker) : renderHoldingCard(item)
            ))}
          </div>

          {sortedHoldings.length === 0 && !showHoldingForm ? (
            <div className="empty-note">No active holdings yet. Use the add slot to create one.</div>
          ) : null}

          <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
            {errorMessage ?? formMessage ?? 'Ticker is required. Google Finance name autofill is not available in the current setup, so ticker is stored as the name.'}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
