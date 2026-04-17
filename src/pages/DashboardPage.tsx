import { useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import {
  buildBenchmarkComparisonCards,
  buildBenchmarkRows,
  calculatePortfolioPeriodReturn,
  createComparisonPeriodLabel,
  validateBenchmarkRows,
} from '../data/benchmarkData'
import { buildHoldingRows } from '../data/sheetData'
import {
  EMPTY_BENCHMARK_FORM,
  getNextBenchmarkDisplayOrder,
  toBenchmarkDrafts,
  validateCustomBenchmarkInput,
} from '../features/benchmarks/benchmarkDrafts'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import { AddIcon, CloseIcon, DeleteIcon, EditIcon } from '../features/holdings/holdingIcons'
import type { BenchmarkComparisonCard, ComparisonPeriod } from '../types/domain'

const COMPARISON_PERIODS: ComparisonPeriod[] = ['YTD', '1Y', '3Y', '5Y']

export function DashboardPage() {
  const { busyState, saveBenchmarks, spreadsheet, snapshot } = useGoogleWorkspace()
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('YTD')
  const [showQuickAddInput, setShowQuickAddInput] = useState(false)
  const [quickAddTicker, setQuickAddTicker] = useState('')
  const [quickAddError, setQuickAddError] = useState<string | null>(null)
  const [editingBenchmarkKey, setEditingBenchmarkKey] = useState<string | null>(null)
  const [benchmarkForm, setBenchmarkForm] = useState(EMPTY_BENCHMARK_FORM)
  const [benchmarkEditorError, setBenchmarkEditorError] = useState<string | null>(null)

  const holdings = buildHoldingRows(snapshot)
  const benchmarkRows = buildBenchmarkRows(snapshot)
  const benchmarkValidation = validateBenchmarkRows(benchmarkRows)
  const comparisonCards = buildBenchmarkComparisonCards(snapshot, holdings, comparisonPeriod)
  const benchmarkDrafts = toBenchmarkDrafts(benchmarkRows)
  const portfolioReturn = calculatePortfolioPeriodReturn(holdings, comparisonPeriod)
  const customBenchmarkCount = benchmarkRows.filter((row) => !row.isDefault).length

  const totalInvested = holdings.reduce((sum, item) => sum + item.invested, 0)
  const totalValue = holdings.reduce((sum, item) => sum + item.marketValue, 0)
  const totalProfit = holdings.reduce((sum, item) => sum + item.unrealizedProfit, 0)
  const totalYield = totalInvested === 0 ? 0 : (totalProfit / totalInvested) * 100

  const benchmarkValidationCaption = benchmarkValidation.duplicateKey
    ? `Duplicate benchmark key: ${benchmarkValidation.duplicateKey}`
    : benchmarkValidation.duplicateTicker
      ? `Duplicate ticker: ${benchmarkValidation.duplicateTicker}`
      : benchmarkValidation.invalidMarketKey
        ? `Only US custom benchmarks are allowed: ${benchmarkValidation.invalidMarketKey}`
        : benchmarkValidation.customLimitExceeded
          ? 'Up to 3 custom benchmarks are allowed.'
          : null

  async function persistBenchmarkDrafts(nextDrafts: ReturnType<typeof toBenchmarkDrafts>) {
    const orderedDrafts = [...nextDrafts].sort((left, right) => left.displayOrder - right.displayOrder)
    const saved = await saveBenchmarks(orderedDrafts)

    if (saved) {
      setShowQuickAddInput(false)
      setQuickAddTicker('')
      setQuickAddError(null)
      setBenchmarkEditorError(null)
      setBenchmarkForm(EMPTY_BENCHMARK_FORM)
      setEditingBenchmarkKey(null)
    }
  }

  async function handleQuickAddBenchmark() {
    const normalizedTicker = quickAddTicker.trim().toUpperCase()

    if (!normalizedTicker) {
      setQuickAddError('Ticker is required.')
      return
    }

    const validation = validateCustomBenchmarkInput(benchmarkDrafts, normalizedTicker, normalizedTicker, null)
    if (validation.duplicateKey || validation.duplicateTicker) {
      setQuickAddError('This ticker is already added.')
      return
    }

    if (validation.customLimitExceeded) {
      setQuickAddError('Up to 3 custom benchmarks are allowed.')
      return
    }

    await persistBenchmarkDrafts([
      ...benchmarkDrafts,
      {
        benchmarkKey: normalizedTicker,
        name: normalizedTicker,
        tickerPrimary: normalizedTicker,
        tickerFallback: '',
        category: 'INDEX',
        market: 'US',
        isDefault: false,
        isEnabled: true,
        displayOrder: getNextBenchmarkDisplayOrder(benchmarkDrafts),
      },
    ])
  }

  function handleStartBenchmarkEdit(benchmarkKey: string) {
    const target = benchmarkRows.find((row) => row.benchmarkKey === benchmarkKey)
    if (!target || target.isDefault) {
      return
    }

    setBenchmarkEditorError(null)
    setEditingBenchmarkKey(target.benchmarkKey)
    setBenchmarkForm({
      benchmarkKey: target.benchmarkKey,
      name: target.name,
      tickerPrimary: target.tickerPrimary,
      tickerFallback: target.tickerFallback,
    })
  }

  function handleCancelBenchmarkEdit() {
    setBenchmarkEditorError(null)
    setEditingBenchmarkKey(null)
    setBenchmarkForm(EMPTY_BENCHMARK_FORM)
  }

  async function handleBenchmarkEditSubmit() {
    if (!editingBenchmarkKey) {
      return
    }

    const normalizedKey = benchmarkForm.benchmarkKey.trim().toUpperCase()
    const normalizedTicker = benchmarkForm.tickerPrimary.trim().toUpperCase()
    const normalizedFallback = benchmarkForm.tickerFallback.trim().toUpperCase()
    const normalizedName = benchmarkForm.name.trim() || normalizedKey

    if (!normalizedKey || !normalizedTicker) {
      setBenchmarkEditorError('Benchmark key and ticker are required.')
      return
    }

    const validation = validateCustomBenchmarkInput(benchmarkDrafts, normalizedKey, normalizedTicker, editingBenchmarkKey)
    if (validation.duplicateKey) {
      setBenchmarkEditorError('Duplicate benchmark keys are not allowed.')
      return
    }

    if (validation.duplicateTicker) {
      setBenchmarkEditorError('Duplicate tickers are not allowed.')
      return
    }

    await persistBenchmarkDrafts(
      benchmarkDrafts.map((row) => (
        row.benchmarkKey === editingBenchmarkKey
          ? {
              ...row,
              benchmarkKey: normalizedKey,
              name: normalizedName,
              tickerPrimary: normalizedTicker,
              tickerFallback: normalizedFallback,
            }
          : row
      )),
    )
  }

  async function handleBenchmarkToggle(benchmarkKey: string) {
    if (!spreadsheet || busyState !== 'idle') {
      return
    }

    await persistBenchmarkDrafts(
      benchmarkDrafts.map((row) => (
        row.benchmarkKey === benchmarkKey
          ? { ...row, isEnabled: !row.isEnabled }
          : row
      )),
    )
  }

  async function handleBenchmarkDelete(benchmarkKey: string) {
    await persistBenchmarkDrafts(benchmarkDrafts.filter((row) => row.benchmarkKey !== benchmarkKey))
  }

  function renderBenchmarkCard(card: BenchmarkComparisonCard) {
    const isMuted = !card.isRenderable || !card.isEnabled || card.status === 'failed'
    const toneClass = isMuted
      ? 'benchmark-card-tone-neutral'
      : card.value >= 0
        ? 'benchmark-card-tone-positive'
        : 'benchmark-card-tone-negative'
    const deltaClass = card.deltaFromPortfolio >= 0 ? 'benchmark-card-delta-positive' : 'benchmark-card-delta-negative'

    return (
      <article
        key={card.benchmarkKey}
        className={[
          'summary-card',
          'benchmark-card',
          toneClass,
          isMuted ? 'benchmark-card-disabled' : 'benchmark-card-enabled',
        ].filter(Boolean).join(' ')}
        data-item-id={`benchmark-card-${card.benchmarkKey}`}
        onClick={() => { void handleBenchmarkToggle(card.benchmarkKey) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void handleBenchmarkToggle(card.benchmarkKey)
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={card.isEnabled}
        aria-label={`${card.name} ${card.isEnabled ? 'disable benchmark' : 'enable benchmark'}`}
      >
        {!card.isDefault ? (
          <div className="benchmark-card-actions-inline" onClick={(event) => event.stopPropagation()}>
            <button
              className="icon-button"
              type="button"
              onClick={() => handleStartBenchmarkEdit(card.benchmarkKey)}
              disabled={busyState !== 'idle'}
              title="Edit benchmark"
              aria-label={`Edit ${card.name}`}
            >
              <EditIcon />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => { void handleBenchmarkDelete(card.benchmarkKey) }}
              disabled={!spreadsheet || busyState !== 'idle'}
              title="Delete benchmark"
              aria-label={`Delete ${card.name}`}
            >
              <DeleteIcon />
            </button>
          </div>
        ) : null}

        <div className="benchmark-card-grid benchmark-card-grid-benchmark">
          <p className="benchmark-card-title">{card.name}</p>
          <span className="benchmark-card-grid-empty" aria-hidden="true" />
          <span className="benchmark-card-grid-empty" aria-hidden="true" />
          <strong className="benchmark-card-return-value">
            {card.value >= 0 ? '+' : ''}{card.value.toFixed(2)}%
          </strong>
          <span className="benchmark-card-delta-label">To Portfolio</span>
          <strong className={['benchmark-card-delta-value', deltaClass].join(' ')}>
            {card.deltaFromPortfolio >= 0 ? '+' : ''}{card.deltaFromPortfolio.toFixed(2)}%p
          </strong>
        </div>

        {card.caption ? <span className="benchmark-card-caption">{card.caption}</span> : null}
      </article>
    )
  }

  const benchmarkTitleActions = showQuickAddInput ? (
    <div className="benchmark-inline-add" onClick={(event) => event.stopPropagation()}>
      <input
        className="text-input benchmark-inline-add-input"
        value={quickAddTicker}
        onChange={(event) => {
          setQuickAddTicker(event.target.value)
          if (quickAddError) {
            setQuickAddError(null)
          }
        }}
        placeholder={customBenchmarkCount >= 3 ? 'Custom limit reached' : 'Ticker'}
        disabled={!spreadsheet || busyState !== 'idle' || customBenchmarkCount >= 3}
      />
      <button
        className="primary-button benchmark-inline-add-button"
        type="button"
        onClick={() => { void handleQuickAddBenchmark() }}
        disabled={!spreadsheet || busyState !== 'idle' || customBenchmarkCount >= 3}
        aria-label="Add benchmark ticker"
        title="Add benchmark ticker"
      >
        <AddIcon />
      </button>
      <button
        className="icon-button benchmark-inline-add-cancel"
        type="button"
        onClick={() => {
          setShowQuickAddInput(false)
          setQuickAddTicker('')
          setQuickAddError(null)
        }}
        disabled={busyState !== 'idle'}
        aria-label="Cancel benchmark add"
      >
        <CloseIcon />
      </button>
    </div>
  ) : (
    <button
      className="icon-button benchmark-header-add-trigger"
      type="button"
      onClick={() => {
        if (spreadsheet && busyState === 'idle' && customBenchmarkCount < 3) {
          setShowQuickAddInput(true)
        }
      }}
      disabled={!spreadsheet || busyState !== 'idle' || customBenchmarkCount >= 3}
      aria-label="Add benchmark"
      title="Add benchmark"
    >
      <AddIcon />
    </button>
  )

  return (
    <div className="page-stack">
      <section className="summary-grid summary-grid-dashboard">
        <SummaryCard title="Portfolio Value" value={`$${totalValue.toFixed(2)}`} tone="neutral" />
        <SummaryCard title="Invested Cost" value={`$${totalInvested.toFixed(2)}`} tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`${totalProfit >= 0 ? '+' : '-'}$${Math.abs(totalProfit).toFixed(2)}`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
        <SummaryCard title="Return" value={`${totalYield >= 0 ? '+' : ''}${totalYield.toFixed(2)}%`} tone={totalYield >= 0 ? 'positive' : 'negative'} className="summary-card-plain-value" />
      </section>

      <SectionCard
        title="Benchmark Comparison"
        titleActions={benchmarkTitleActions}
        description=""
        actions={(
          <div className="period-toggle-row">
            {COMPARISON_PERIODS.map((period) => (
              <button
                key={period}
                className={`period-toggle ${comparisonPeriod === period ? 'period-toggle-active' : ''}`}
                onClick={() => setComparisonPeriod(period)}
                type="button"
              >
                {createComparisonPeriodLabel(period)}
              </button>
            ))}
          </div>
        )}
      >
        {benchmarkValidationCaption ? (
          <div className="message-box message-box-neutral benchmark-inline-note">{benchmarkValidationCaption}</div>
        ) : null}

        {quickAddError ? (
          <div className="message-box message-box-neutral benchmark-inline-note">{quickAddError}</div>
        ) : null}

        {!spreadsheet ? (
          <div className="message-box message-box-neutral benchmark-inline-note">[Dev/Test] Spreadsheet not connected. Dashboard preview uses sample benchmark data.</div>
        ) : null}

        <div className="summary-grid benchmark-summary-grid">
          <article className="summary-card benchmark-card summary-card-accent benchmark-portfolio-card">
            <div className="benchmark-card-grid benchmark-card-grid-portfolio">
              <p className="benchmark-card-title">Portfolio</p>
              <span className="benchmark-card-grid-empty" aria-hidden="true" />
              <span className="benchmark-card-grid-empty" aria-hidden="true" />
              <strong className="benchmark-card-return-value">
                {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
              </strong>
              <span className="benchmark-card-grid-empty" aria-hidden="true" />
              <strong className={totalProfit >= 0 ? 'benchmark-card-amount-value benchmark-card-delta-positive' : 'benchmark-card-amount-value benchmark-card-delta-negative'}>
                {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
              </strong>
            </div>
          </article>

          {comparisonCards.map((card) => renderBenchmarkCard(card))}
        </div>

        {editingBenchmarkKey ? (
          <div className="benchmark-editor-panel">
            <div className="benchmark-editor-head">
              <strong>Edit Custom Benchmark</strong>
              <span>{editingBenchmarkKey}</span>
            </div>

            <div className="benchmark-form-grid">
              <label className="field-block" htmlFor="benchmark-key">
                <span>Benchmark key</span>
                <input
                  id="benchmark-key"
                  className="text-input"
                  value={benchmarkForm.benchmarkKey}
                  onChange={(event) => setBenchmarkForm((current) => ({ ...current, benchmarkKey: event.target.value }))}
                  placeholder="QQQM"
                />
              </label>
              <label className="field-block" htmlFor="benchmark-name">
                <span>Name</span>
                <input
                  id="benchmark-name"
                  className="text-input"
                  value={benchmarkForm.name}
                  onChange={(event) => setBenchmarkForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="QQQM"
                />
              </label>
              <label className="field-block" htmlFor="benchmark-primary">
                <span>Primary ticker</span>
                <input
                  id="benchmark-primary"
                  className="text-input"
                  value={benchmarkForm.tickerPrimary}
                  onChange={(event) => setBenchmarkForm((current) => ({ ...current, tickerPrimary: event.target.value }))}
                  placeholder="QQQM"
                />
              </label>
              <label className="field-block" htmlFor="benchmark-fallback">
                <span>Fallback ticker</span>
                <input
                  id="benchmark-fallback"
                  className="text-input"
                  value={benchmarkForm.tickerFallback}
                  onChange={(event) => setBenchmarkForm((current) => ({ ...current, tickerFallback: event.target.value }))}
                  placeholder="Optional"
                />
              </label>
            </div>

            {benchmarkEditorError ? (
              <div className="message-box message-box-neutral benchmark-inline-note">{benchmarkEditorError}</div>
            ) : null}

            <div className="button-row">
              <button className="primary-button" type="button" onClick={() => { void handleBenchmarkEditSubmit() }} disabled={!spreadsheet || busyState !== 'idle'}>
                Save benchmark
              </button>
              <button className="secondary-button" type="button" onClick={handleCancelBenchmarkEdit} disabled={busyState !== 'idle'}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
