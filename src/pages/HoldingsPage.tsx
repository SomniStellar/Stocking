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
import '../styles/holdings.css'
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

function getHoldingActionLabel(side: HoldingDraft['side']) {
  return side === 'BUY' ? 'Add' : 'Reduce'
}

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
  const [costInputMode, setCostInputMode] = useState<CostInputMode>('total')
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
    setCostInputMode('total')
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
    setCostInputMode('total')
    setCostInput(Number((nextDraft.avgPrice * nextDraft.quantity).toFixed(2)))
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

  function getAveragePriceFromInput(mode: CostInputMode, inputValue: number, quantity: number, fallbackAvgPrice: number) {
    if (mode === 'avg') {
      return inputValue > 0 ? inputValue : fallbackAvgPrice
    }

    if (quantity > 0 && inputValue > 0) {
      return inputValue / quantity
    }

    return fallbackAvgPrice
  }

  function getCostInputFromAveragePrice(mode: CostInputMode, avgPrice: number, quantity: number) {
    if (avgPrice <= 0) {
      return 0
    }

    if (mode === 'avg') {
      return Number(avgPrice.toFixed(2))
    }

    return quantity > 0 ? Number((avgPrice * quantity).toFixed(2)) : 0
  }

  function toggleCostMode() {
    setCostInputMode((current) => {
      const nextMode = current === 'avg' ? 'total' : 'avg'
      const normalizedAvgPrice = draft.avgPrice > 0
        ? draft.avgPrice
        : getAveragePriceFromInput(current, costInput, draft.quantity, draft.avgPrice)

      setCostInput(getCostInputFromAveragePrice(nextMode, normalizedAvgPrice, draft.quantity))
      setFormMessage(null)
      return nextMode
    })
  }

  function handleCostInputChange(value: number) {
    setCostInput(value)
    setDraft((current) => {
      const nextAvgPrice = costInputMode === 'avg'
        ? value
        : value > 0 && current.quantity > 0
          ? value / current.quantity
          : current.avgPrice

      return { ...current, avgPrice: nextAvgPrice }
    })
  }

  function handleQuantityChange(value: number) {
    setDraft((current) => {
      const nextAvgPrice = costInputMode === 'total' && value > 0 && costInput > 0
        ? costInput / value
        : current.avgPrice

      return { ...current, quantity: value, avgPrice: nextAvgPrice }
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
      setFormMessage(costInputMode === 'total' ? 'Total price must be greater than 0.' : 'Average price must be greater than 0.')
      return
    }

    const avgPrice = draft.avgPrice > 0
      ? draft.avgPrice
      : costInputMode === 'total'
        ? costInput / draft.quantity
        : costInput
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

    setFormMessage(editingTicker ? `${normalizedTicker} updated.` : `${getHoldingActionLabel(draft.side)} saved.`)
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

        <div className="metric-grid holdings-metric-grid holding-input-grid">
          <div className="metric-card holding-input-cell holding-input-ticker">
            <span>Ticker</span>
            <input
              id={`${mode}-holding-ticker`}
              className="text-input"
              value={draft.ticker}
              onChange={(event) => setDraft((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))}
              placeholder="AAPL"
            />
          </div>

          <div className="metric-card holding-input-cell holding-input-cost">
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
              <span>{costInputMode === 'avg' ? 'Avg Price' : 'Total Price'}</span>
            </div>
            <input
              className="text-input"
              type="number"
              min="0"
              step="0.01"
              value={costInput || ''}
              onChange={(event) => handleCostInputChange(Number(event.target.value) || 0)}
              placeholder={costInputMode === 'avg' ? '185.25' : '1945.13'}
            />
          </div>

          <div className="metric-card holding-input-cell holding-input-side">
            <button
              className={`toggle-button toggle-button-side ${draft.side === 'BUY' ? 'toggle-button-buy' : 'toggle-button-sell'}`}
              type="button"
              onClick={toggleSide}
              aria-label={draft.side === 'BUY' ? 'Switch to reduce position' : 'Switch to add position'}
            >
              {getHoldingActionLabel(draft.side)}
            </button>
          </div>

          <div className="metric-card holding-input-cell holding-input-quantity">
            <span>Quantity</span>
            <input
              id={`${mode}-holding-quantity`}
              className="text-input"
              type="number"
              min="0"
              step="0.0001"
              value={draft.quantity || ''}
              onChange={(event) => handleQuantityChange(Number(event.target.value) || 0)}
              placeholder="10.5000"
            />
          </div>

          <div className="metric-card holding-input-cell holding-input-tags">
            <span>Tags</span>
            <input
              id={`${mode}-holding-tags`}
              className="text-input"
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="core, tech"
            />
          </div>

          <div className="metric-card holding-input-cell holding-input-save">
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
          <div className="metric-card holding-cell holding-cell-name">
            <strong>{item.name || item.ticker}</strong>
            <small>{item.ticker}</small>
          </div>
          <div className="metric-card holding-cell holding-cell-stack holding-cell-price">
            <span>Price / Avg</span>
            <div className="metric-stack3-values">
              <div className="metric-stack3-line">
                <strong>{formatCurrency(item.closeyest)}</strong>
              </div>
              <div className="metric-stack3-line">
                <strong>{formatCurrency(item.avgPrice)}</strong>
              </div>
            </div>
          </div>
          <div className="metric-card holding-cell holding-cell-stack holding-cell-profit">
            <span>P/L</span>
            <div className="metric-stack3-values">
              <div className="metric-stack3-line">
                <strong className={item.unrealizedProfit >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatCurrency(item.unrealizedProfit)}
                </strong>
              </div>
              <div className="metric-stack3-line">
                <strong className={item.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatPercent(item.unrealizedReturn)}
                </strong>
              </div>
            </div>
          </div>
          <div className="metric-card holding-cell holding-cell-quantity">
            <span>Quantity</span>
            <strong>{formatQuantity(item.quantity)}</strong>
          </div>
          <div className="metric-card holding-cell holding-cell-stack holding-cell-value">
            <span>Value / Inv.</span>
            <div className="metric-stack3-values">
              <div className="metric-stack3-line">
                <strong>{formatCurrency(item.marketValue)}</strong>
              </div>
              <div className="metric-stack3-line">
                <strong>{formatCurrency(item.invested)}</strong>
              </div>
            </div>
          </div>
          <div className="metric-card holding-cell holding-cell-period">
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
        <div className="entity-card-topline entity-card-topline-summary holding-summary-topline">
          <span className="tag-chip tag-chip-total">Total</span>
        </div>
        <div className="metric-grid holdings-metric-grid holdings-summary-grid">
          <div className="metric-card holding-summary-cell holding-summary-label">
            <strong>Portfolio</strong>
          </div>
          <div className="metric-card holding-summary-cell holding-summary-value">
            <span>Value</span>
            <strong>{formatCurrency(summary.marketValue)}</strong>
          </div>
          <div className="metric-card holding-summary-cell holding-cell-stack holding-summary-profit">
            <span>P/L</span>
            <div className="metric-stack3-values">
              <div className="metric-stack3-line">
                <strong className={summary.unrealized >= 0 ? 'text-positive' : 'text-negative'}>{formatCurrency(summary.unrealized)}</strong>
              </div>
              <div className="metric-stack3-line">
                <strong className={summary.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>{formatPercent(summary.unrealizedReturn)}</strong>
              </div>
            </div>
          </div>
          <div className="metric-card holding-summary-cell holding-summary-holdings">
            <span>Holdings</span>
            <strong>{summary.positions}</strong>
          </div>
          <div className="metric-card holding-summary-cell holding-summary-invested">
            <span>Invested</span>
            <strong>{formatCurrency(summary.invested)}</strong>
          </div>
          <div className="metric-card holding-summary-cell holding-summary-period">
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
        className="entity-card entity-card-add-slot entity-card-add-slot-holdings"
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
        headClassName="fixed-track-420-3-2-1"
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
          <div className="entity-card-grid entity-card-grid-holdings-top centered-fixed-card-grid fixed-grid-420-2-1">
            {renderSummaryCard()}
            {showHoldingForm ? renderEditorCard('create') : renderAddSlotCard()}
          </div>

          <div className={`entity-card-grid entity-card-grid-holdings centered-fixed-card-grid fixed-grid-420-3-2-1${draggingTicker ? ' entity-card-grid-drag-active' : ''}`}>
            {filteredHoldings.map((item) => (
              editingTicker === item.ticker ? renderEditorCard('edit', item.ticker) : renderHoldingCard(item)
            ))}
          </div>

          {filteredHoldings.length === 0 && !showHoldingForm ? (
            <div className="empty-note">No holdings yet.</div>
          ) : null}

          {(errorMessage || formMessage) ? (
            <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
              {errorMessage ?? formMessage}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
