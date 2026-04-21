import { useState, type CSSProperties } from 'react'
import { DashboardComparisonChart } from '../components/DashboardComparisonChart'
import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import { createComparisonPeriodLabel } from '../data/benchmarkData'
import { buildDashboardComparisonViewModel } from '../data/dashboardData'
import {
  getNextBenchmarkDisplayOrder,
  toBenchmarkDrafts,
  validateCustomBenchmarkInput,
} from '../features/benchmarks/benchmarkDrafts'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import { AddIcon, CloseIcon, DeleteIcon } from '../features/holdings/holdingIcons'
import '../styles/dashboard.css'
import type { BenchmarkComparisonCard, ComparisonPeriod } from '../types/domain'

const COMPARISON_PERIODS: ComparisonPeriod[] = ['YTD', '3Y', '5Y']
const FALLBACK_CARD_COLOR = 'rgba(255, 255, 255, 0.18)'

export function DashboardPage() {
  const { busyState, saveBenchmarks, spreadsheet, snapshot } = useGoogleWorkspace()
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('YTD')
  const [showQuickAddInput, setShowQuickAddInput] = useState(false)
  const [quickAddTicker, setQuickAddTicker] = useState('')
  const [quickAddError, setQuickAddError] = useState<string | null>(null)

  const comparisonView = buildDashboardComparisonViewModel(snapshot, comparisonPeriod)
  const benchmarkRows = comparisonView.benchmarkRows
  const comparisonCards = comparisonView.comparisonCards
  const benchmarkDrafts = toBenchmarkDrafts(benchmarkRows)
  const portfolioReturn = comparisonView.portfolioReturn
  const portfolioProfitAmount = comparisonView.portfolioProfitAmount
  const customBenchmarkCount = benchmarkRows.filter((row) => !row.isDefault).length
  const {
    summary: { totalInvested, totalProfit, totalValue, totalYield },
    benchmarkValidationCaption,
    rangeChart,
  } = comparisonView
  const chartColorMap = new Map(rangeChart.lines.map((line) => [line.benchmarkKey, line.color]))

  async function persistBenchmarkDrafts(nextDrafts: ReturnType<typeof toBenchmarkDrafts>) {
    const orderedDrafts = [...nextDrafts].sort((left, right) => left.displayOrder - right.displayOrder)
    const saved = await saveBenchmarks(orderedDrafts)

    if (saved) {
      setShowQuickAddInput(false)
      setQuickAddTicker('')
      setQuickAddError(null)
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
    const returnClass = card.value >= 0 ? 'benchmark-card-return-positive' : 'benchmark-card-return-negative'
    const accentColor = chartColorMap.get(card.benchmarkKey) ?? FALLBACK_CARD_COLOR

    return (
      <article
        key={card.benchmarkKey}
        className={[
          'summary-card',
          'benchmark-card',
          toneClass,
          isMuted ? 'benchmark-card-disabled' : 'benchmark-card-enabled',
        ].filter(Boolean).join(' ')}
        style={{ '--benchmark-accent': accentColor } as CSSProperties}
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
          <div
            className="benchmark-card-actions-inline"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
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
          <p className="benchmark-card-title benchmark-card-title-main">{card.name}</p>
          <span className="benchmark-card-grid-empty" aria-hidden="true" />
          <span className="benchmark-card-grid-empty" aria-hidden="true" />
          <strong className={['benchmark-card-return-value', 'benchmark-card-return-main', returnClass].join(' ')}>
            {card.value >= 0 ? '+' : ''}{card.value.toFixed(2)}%
          </strong>
          <span className="benchmark-card-delta-label benchmark-card-delta-label-main">vs Port.</span>
          <strong className={['benchmark-card-delta-value', 'benchmark-card-delta-main', deltaClass].join(' ')}>
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
        className="secondary-button benchmark-inline-add-button"
        type="button"
        onClick={() => { void handleQuickAddBenchmark() }}
        disabled={!spreadsheet || busyState !== 'idle' || customBenchmarkCount >= 3}
        aria-label="Add benchmark ticker"
        title="Add benchmark ticker"
      >
        Save
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
      <section className="summary-grid summary-grid-dashboard centered-fixed-card-grid fixed-grid-280-4-2-1">
        <SummaryCard title="Portfolio Value" value={`$${totalValue.toFixed(2)}`} tone="neutral" />
        <SummaryCard title="Invested Cost" value={`$${totalInvested.toFixed(2)}`} tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`${totalProfit >= 0 ? '+' : '-'}$${Math.abs(totalProfit).toFixed(2)}`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
        <SummaryCard title="Return" value={`${totalYield >= 0 ? '+' : ''}${totalYield.toFixed(2)}%`} tone={totalYield >= 0 ? 'positive' : 'negative'} className="summary-card-plain-value" />
      </section>

      <SectionCard
        title="Benchmark Comparison"
        titleActions={benchmarkTitleActions}
        description=""
        headClassName="fixed-track-280-4-3-2-1"
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

        <div className="summary-grid benchmark-summary-grid centered-fixed-card-grid fixed-grid-280-4-3-2-1">
          <article
            className="summary-card benchmark-card summary-card-accent benchmark-portfolio-card"
            style={{ '--benchmark-accent': chartColorMap.get('portfolio') ?? '#f6a55b' } as CSSProperties}
          >
            <div className="benchmark-card-grid benchmark-card-grid-portfolio">
              <p className="benchmark-card-title benchmark-card-title-main">Portfolio</p>
              <span className="benchmark-card-grid-empty" aria-hidden="true" />
              <span className="benchmark-card-grid-empty" aria-hidden="true" />
              <strong className={['benchmark-card-return-value', 'benchmark-card-return-main', portfolioReturn >= 0 ? 'benchmark-card-return-positive' : 'benchmark-card-return-negative'].join(' ')}>
                {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
              </strong>
              <span className="benchmark-card-grid-empty" aria-hidden="true" />
              <strong className={portfolioProfitAmount >= 0 ? 'benchmark-card-amount-value benchmark-card-amount-main benchmark-card-delta-positive' : 'benchmark-card-amount-value benchmark-card-amount-main benchmark-card-delta-negative'}>
                {portfolioProfitAmount >= 0 ? '+' : '-'}${Math.abs(portfolioProfitAmount).toFixed(2)}
              </strong>
            </div>
          </article>

          {comparisonCards.map((card) => renderBenchmarkCard(card))}
        </div>

        <DashboardComparisonChart chart={rangeChart} />
      </SectionCard>
    </div>
  )
}
