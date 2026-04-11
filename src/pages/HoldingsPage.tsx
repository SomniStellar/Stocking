import { type DragEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { buildHoldingRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import { AddIcon, CloseIcon, DeleteIcon, EditIcon, ResetIcon } from '../features/holdings/holdingIcons'
import {
  buildReorderedTickerList,
  getHoldingDropPlacement,
  sortHoldingsByDisplayOrder,
  type HoldingDropPlacement,
} from '../features/holdings/holdingOrder'
import {
  buildHoldingDraft,
  formatCurrency,
  formatPercent,
  formatQuantity,
  normalizeTags,
} from '../features/holdings/holdingUtils'
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

type CostInputMode = 'avg' | 'total'
type DragTargetState = {
  ticker: string
  placement: HoldingDropPlacement
} | null

export function HoldingsPage() {
  const {
    addHolding,
    busyState,
    deleteHolding,
    errorMessage,
    reorderHoldings,
    snapshot,
    spreadsheet,
    updateHolding,
  } = useGoogleWorkspace()
  const holdings = buildHoldingRows(snapshot)
  const [draft, setDraft] = useState<HoldingDraft>(INITIAL_DRAFT)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [showHoldingForm, setShowHoldingForm] = useState(false)
  const [activeTag, setActiveTag] = useState('all')
  const [costInputMode, setCostInputMode] = useState<CostInputMode>('avg')
  const [costInput, setCostInput] = useState(0)
  const [editingTicker, setEditingTicker] = useState<string | null>(null)
  const [highlightedTicker, setHighlightedTicker] = useState<string | null>(null)
  const [draggingTicker, setDraggingTicker] = useState<string | null>(null)
  const [dragTarget, setDragTarget] = useState<DragTargetState>(null)
  const [orderedTickerOverride, setOrderedTickerOverride] = useState<string[] | null>(null)

  const tagOptions = useMemo(() => getTagOptions(holdings.map((item) => item.tags)), [holdings])

  const orderedHoldings = useMemo(() => {
    const base = sortHoldingsByDisplayOrder(holdings)

    if (!orderedTickerOverride) {
      return base
    }

    const orderMap = new Map(orderedTickerOverride.map((ticker, index) => [ticker, index]))
    return [...base].sort((left, right) => {
      const leftIndex = orderMap.get(left.ticker) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = orderMap.get(right.ticker) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex
    })
  }, [holdings, orderedTickerOverride])

  const filteredHoldings = useMemo(
    () => orderedHoldings.filter((item) => matchesTagFilter(item.tags, activeTag)),
    [activeTag, orderedHoldings],
  )

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

  const previewTags = useMemo(
    () => parseTags(draft.tags).sort((left, right) => left.localeCompare(right)),
    [draft.tags],
  )

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
    setCostInputMode((current) => {
      const nextMode = current === 'avg' ? 'total' : 'avg'

      setCostInput((existing) => {
        if (draft.quantity <= 0 || existing <= 0) {
          return existing
        }

        if (nextMode === 'total') {
          return Number((existing * draft.quantity).toFixed(6))
        }

        return Number((existing / draft.quantity).toFixed(6))
      })
      setFormMessage(null)
      return nextMode
    })
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

    setFormMessage(editingTicker ? `${normalizedTicker} updated.` : `${draft.side} saved.`)
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
      setFormMessage(`${ticker} removed.`)
    }
  }

  function clearDragState() {
    setDraggingTicker(null)
    setDragTarget(null)
  }

  function handleDragStart(event: DragEvent<HTMLElement>, ticker: string) {
    if (busyState !== 'idle') {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', ticker)
    setDraggingTicker(ticker)
    setDragTarget({ ticker, placement: 'before' })
    setFormMessage(null)
  }

  function handleDragOver(event: DragEvent<HTMLElement>, ticker: string) {
    if (!draggingTicker || draggingTicker === ticker) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    const placement = getHoldingDropPlacement(event.clientY, event.currentTarget.getBoundingClientRect())
    setDragTarget((current) => (
      current?.ticker === ticker && current.placement === placement
        ? current
        : { ticker, placement }
    ))
  }

  async function handleDrop(targetTicker: string, placement: HoldingDropPlacement) {
    if (!draggingTicker) {
      return
    }

    const allTickers = orderedHoldings.map((item) => item.ticker)
    const visibleTickers = filteredHoldings.map((item) => item.ticker)
    const nextTickers = buildReorderedTickerList(allTickers, visibleTickers, draggingTicker, targetTicker, placement)

    clearDragState()

    if (nextTickers.every((ticker, index) => ticker === allTickers[index])) {
      return
    }

    setOrderedTickerOverride(nextTickers)
    const saved = await reorderHoldings(nextTickers)

    if (saved) {
      setFormMessage(activeTag === 'all' ? 'Order updated.' : 'Filtered order updated.')
      return
    }

    setOrderedTickerOverride(null)
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
            <div
              className="field-label-inline field-label-inline-clickable field-label-inline-mode-toggle"
              onClick={toggleCostMode}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggleCostMode()
                }
              }}
            >
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

          <div className="metric-card metric-card-input metric-card-quantity">
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

          <div className="metric-card metric-card-input metric-card-value">
            <span>Tags</span>
            <input
              id={`${mode}-holding-tags`}
              className="text-input"
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="core, tech"
            />
          </div>

          <div className="metric-card metric-card-actions metric-card-period-list">
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
    const isDragging = draggingTicker === item.ticker
    const isDropTarget = dragTarget?.ticker === item.ticker && draggingTicker !== item.ticker
    const dropPlacement = isDropTarget ? dragTarget?.placement : null

    return (
      <article
        key={`${item.ticker}-${item.name}`}
        className={[
          'entity-card',
          'entity-card-draggable',
          highlightedTicker === item.ticker ? 'entity-card-highlight' : '',
          isDragging ? 'entity-card-dragging' : '',
          isDropTarget ? 'entity-card-drop-target' : '',
          dropPlacement === 'before' ? 'entity-card-drop-before' : '',
          dropPlacement === 'after' ? 'entity-card-drop-after' : '',
        ].filter(Boolean).join(' ')}
        data-item-id={item.ticker}
        draggable={busyState === 'idle'}
        onDragStart={(event) => handleDragStart(event, item.ticker)}
        onDragOver={(event) => handleDragOver(event, item.ticker)}
        onDrop={(event) => {
          event.preventDefault()
          const placement = dragTarget?.ticker === item.ticker ? dragTarget.placement : 'before'
          void handleDrop(item.ticker, placement)
        }}
        onDragEnd={clearDragState}
      >
        <span className="drag-insert-guide drag-insert-guide-before" aria-hidden="true" />
        <span className="drag-insert-guide drag-insert-guide-after" aria-hidden="true" />
        <div className="entity-card-topline">
          <div className="tag-chip-row tag-chip-row-tight">
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

        <div className="metric-grid holdings-metric-grid holdings-card-grid">
          <div className="metric-card metric-card-ticker-display">
            <strong>{item.name || item.ticker}</strong>
            <small>{item.ticker}</small>
          </div>
          <div className="metric-card metric-card-price metric-card-paired">
            <div className="metric-pair-grid">
              <div className="metric-pair-block">
                <span>Price</span>
                <strong>{formatCurrency(item.closeyest)}</strong>
              </div>
              <div className="metric-pair-block">
                <span>Avg</span>
                <strong>{formatCurrency(item.avgPrice)}</strong>
              </div>
            </div>
          </div>
          <div className="metric-card metric-card-profit metric-card-profit-compact">
            <span>P/L</span>
            <div className="metric-profit-values">
              <strong className={item.unrealizedProfit >= 0 ? 'text-positive' : 'text-negative'}>
                {formatCurrency(item.unrealizedProfit)}
              </strong>
              <strong className={item.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>
                {formatPercent(item.unrealizedReturn)}
              </strong>
            </div>
          </div>
          <div className="metric-card metric-card-quantity">
            <span>Quantity</span>
            <strong>{formatQuantity(item.quantity)}</strong>
          </div>
          <div className="metric-card metric-card-value metric-card-paired">
            <div className="metric-pair-grid">
              <div className="metric-pair-block">
                <span>Value</span>
                <strong>{formatCurrency(item.marketValue)}</strong>
              </div>
              <div className="metric-pair-block">
                <span>Invested</span>
                <strong>{formatCurrency(item.invested)}</strong>
              </div>
            </div>
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
        <div className="entity-card-topline entity-card-topline-summary">
          <strong className="summary-card-title">Portfolio</strong>
          <span className="tag-chip tag-chip-total">Total</span>
        </div>

        <div className="metric-grid holdings-metric-grid holdings-summary-grid">
          <div className="metric-card metric-card-ticker-display">
            <strong>Portfolio</strong>
            <small>Total</small>
          </div>
          <div className="metric-card metric-card-price">
            <span>Value</span>
            <strong>{formatCurrency(summary.marketValue)}</strong>
          </div>
          <div className="metric-card metric-card-profit metric-card-profit-compact">
            <span>P/L</span>
            <div className="metric-profit-values">
              <strong className={summary.unrealized >= 0 ? 'text-positive' : 'text-negative'}>{formatCurrency(summary.unrealized)}</strong>
              <strong className={summary.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(summary.unrealizedReturn)}</strong>
            </div>
          </div>
          <div className="metric-card metric-card-quantity">
            <span>Holdings</span>
            <strong>{summary.positions}</strong>
          </div>
          <div className="metric-card metric-card-value">
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
      <article
        className="entity-card entity-card-add-slot"
        data-item-id="holding-add-slot"
        onClick={openCreateForm}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openCreateForm()
          }
        }}
      >
        <AddIcon />
      </article>
    )
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Holdings"
        description="Manual order with tag filtering."
        actions={(
          <label className="field-inline field-inline-compact" htmlFor="holding-tag-filter">
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
        )}
      >
        <div className="stack-block">
          {!spreadsheet && (showHoldingForm || editingTicker) ? (
            <div className="message-box message-box-neutral">
              Connect a spreadsheet before saving holdings.
            </div>
          ) : null}

          <div className={`entity-card-grid entity-card-grid-holdings${draggingTicker ? ' entity-card-grid-drag-active' : ''}`}>
            {renderSummaryCard()}
            {showHoldingForm ? renderEditorCard('create') : renderAddSlotCard()}
            {filteredHoldings.map((item) => (
              editingTicker === item.ticker ? renderEditorCard('edit', item.ticker) : renderHoldingCard(item)
            ))}
          </div>

          {filteredHoldings.length === 0 && !showHoldingForm ? (
            <div className="empty-note">No holdings yet.</div>
          ) : null}

          <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
            {errorMessage ?? formMessage ?? 'Drag cards to reorder.'}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
