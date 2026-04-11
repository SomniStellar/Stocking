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
import { EMPTY_BENCHMARK_FORM, getNextBenchmarkDisplayOrder, toBenchmarkDrafts, validateCustomBenchmarkInput } from '../features/benchmarks/benchmarkDrafts'
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
    ? `중복 benchmark key: ${benchmarkValidation.duplicateKey}`
    : benchmarkValidation.duplicateTicker
      ? `중복 티커: ${benchmarkValidation.duplicateTicker}`
      : benchmarkValidation.invalidMarketKey
        ? `미국 외 시장 사용자 지표: ${benchmarkValidation.invalidMarketKey}`
        : benchmarkValidation.customLimitExceeded
          ? '사용자 추가 지표는 최대 3개까지 허용됨'
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
      setQuickAddError('티커를 입력해야 함')
      return
    }

    const validation = validateCustomBenchmarkInput(benchmarkDrafts, normalizedTicker, normalizedTicker, null)
    if (validation.duplicateKey || validation.duplicateTicker) {
      setQuickAddError('이미 추가된 티커임')
      return
    }

    if (validation.customLimitExceeded) {
      setQuickAddError('사용자 추가 지표는 최대 3개까지 허용됨')
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
      setBenchmarkEditorError('benchmark key와 ticker가 필요함')
      return
    }

    const validation = validateCustomBenchmarkInput(benchmarkDrafts, normalizedKey, normalizedTicker, editingBenchmarkKey)
    if (validation.duplicateKey) {
      setBenchmarkEditorError('중복 benchmark key는 허용되지 않음')
      return
    }

    if (validation.duplicateTicker) {
      setBenchmarkEditorError('중복 티커는 허용되지 않음')
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
    const toneClass = !card.isRenderable || !card.isEnabled || card.status === 'failed'
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
        aria-label={`${card.name} ${card.isEnabled ? '비활성화' : '활성화'}`}
      >
        <div className="benchmark-card-head">
          <p className="benchmark-card-title">{card.name}</p>
          {!card.isDefault ? (
            <div className="benchmark-card-actions" onClick={(event) => event.stopPropagation()}>
              <button
                className="icon-button"
                type="button"
                onClick={() => handleStartBenchmarkEdit(card.benchmarkKey)}
                disabled={busyState !== 'idle'}
                title="Edit benchmark"
                aria-label={`${card.name} 수정`}
              >
                <EditIcon />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => { void handleBenchmarkDelete(card.benchmarkKey) }}
                disabled={!spreadsheet || busyState !== 'idle'}
                title="Delete benchmark"
                aria-label={`${card.name} 삭제`}
              >
                <DeleteIcon />
              </button>
            </div>
          ) : null}
        </div>

        <div className="benchmark-card-row benchmark-card-row-primary">
          <span className="benchmark-card-return-label">Return</span>
          <strong className="benchmark-card-return-value">
            {card.value >= 0 ? '+' : ''}{card.value.toFixed(2)}%
          </strong>
        </div>

        <div className="benchmark-card-row benchmark-card-row-secondary">
          <span className="benchmark-card-delta-label">To Portfolio</span>
          <strong className={deltaClass}>
            {card.deltaFromPortfolio >= 0 ? '+' : ''}{card.deltaFromPortfolio.toFixed(2)}%p
          </strong>
        </div>

        {card.caption ? <span className="benchmark-card-caption">{card.caption}</span> : null}
      </article>
    )
  }

  return (
    <div className="page-stack">
      <section className="summary-grid summary-grid-dashboard">
        <SummaryCard title="Portfolio Value" value={`$${totalValue.toFixed(2)}`} caption="Current holdings snapshot" tone="neutral" />
        <SummaryCard title="Invested Cost" value={`$${totalInvested.toFixed(2)}`} caption="Current cost basis" tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`$${totalProfit.toFixed(2)}`} caption={`${totalYield.toFixed(2)}% return`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
      </section>

      <SectionCard
        title="Benchmark Comparison"
        description="Portfolio and benchmark performance are reviewed in one section."
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

        {!spreadsheet ? (
          <div className="message-box message-box-neutral benchmark-inline-note">[Dev/Test] Spreadsheet not connected. Dashboard preview uses sample benchmark data.</div>
        ) : null}

        <div className="summary-grid benchmark-summary-grid">
          <SummaryCard
            title="Portfolio"
            value={`${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(2)}%`}
            tone="accent"
            className="benchmark-portfolio-card"
          />

          {comparisonCards.map((card) => renderBenchmarkCard(card))}

          <article
            className={`summary-card benchmark-add-card ${showQuickAddInput ? 'benchmark-add-card-open' : 'benchmark-add-card-closed'}`}
            data-item-id="benchmark-add-card"
            onClick={() => {
              if (!showQuickAddInput && spreadsheet && busyState === 'idle' && customBenchmarkCount < 3) {
                setShowQuickAddInput(true)
              }
            }}
            onKeyDown={(event) => {
              if (!showQuickAddInput && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                if (spreadsheet && busyState === 'idle' && customBenchmarkCount < 3) {
                  setShowQuickAddInput(true)
                }
              }
            }}
            role={showQuickAddInput ? undefined : 'button'}
            tabIndex={showQuickAddInput ? undefined : 0}
            aria-label={showQuickAddInput ? undefined : 'Add benchmark'}
          >
            {showQuickAddInput ? (
              <>
                <div className="summary-card-head">
                  <p>Add Benchmark</p>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowQuickAddInput(false)
                      setQuickAddError(null)
                      setQuickAddTicker('')
                    }}
                    disabled={busyState !== 'idle'}
                    aria-label="Close benchmark quick add"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="benchmark-add-card-form" onClick={(event) => event.stopPropagation()}>
                  <input
                    className="text-input"
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
                    className="primary-button"
                    type="button"
                    onClick={() => { void handleQuickAddBenchmark() }}
                    disabled={!spreadsheet || busyState !== 'idle' || customBenchmarkCount >= 3}
                  >
                    Add
                  </button>
                </div>
                <span className="benchmark-card-caption">{quickAddError ?? (customBenchmarkCount >= 3 ? '사용자 추가 지표는 최대 3개까지 허용됨' : '')}</span>
              </>
            ) : (
              <div className="benchmark-add-card-launcher">
                <AddIcon />
                <strong>Add Benchmark</strong>
              </div>
            )}
          </article>
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
