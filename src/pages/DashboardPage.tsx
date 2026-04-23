import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { DashboardComparisonChart } from '../components/DashboardComparisonChart'
import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import { createComparisonPeriodLabel } from '../data/benchmarkData'
import { buildDashboardComparisonViewModel } from '../data/dashboardData'
import {
  BENCHMARK_ACCENT_PALETTE,
  DEFAULT_PORTFOLIO_ACCENT_COLOR,
  getRecommendedBenchmarkAccentColor,
} from '../features/benchmarks/benchmarkAccent'
import { buildReorderedBenchmarkKeys, getBenchmarkDropPlacement, type BenchmarkDropPlacement } from '../features/benchmarks/benchmarkOrder'
import {
  getNextBenchmarkDisplayOrder,
  toBenchmarkDrafts,
  validateCustomBenchmarkInput,
} from '../features/benchmarks/benchmarkDrafts'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import { AddIcon, CloseIcon, DeleteIcon } from '../features/holdings/holdingIcons'
import '../styles/dashboard.css'
import type { BenchmarkComparisonCard, BenchmarkDraft, ComparisonPeriod } from '../types/domain'

const COMPARISON_PERIODS: ComparisonPeriod[] = ['YTD', '3Y', '5Y']
const PORTFOLIO_ACCENT_STORAGE_KEY = 'stocking:portfolioAccent'

interface DragTargetState {
  benchmarkKey: string
  placement: BenchmarkDropPlacement
}

function reorderBenchmarkDrafts(drafts: BenchmarkDraft[], orderedKeys: string[]) {
  const orderMap = new Map(orderedKeys.map((key, index) => [key, index + 1]))

  return drafts.map((draft) => ({
    ...draft,
    displayOrder: orderMap.get(draft.benchmarkKey) ?? draft.displayOrder,
  }))
}

export function DashboardPage() {
  const { busyState, saveBenchmarks, spreadsheet, snapshot } = useGoogleWorkspace()
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('YTD')
  const [showQuickAddInput, setShowQuickAddInput] = useState(false)
  const [quickAddTicker, setQuickAddTicker] = useState('')
  const [quickAddError, setQuickAddError] = useState<string | null>(null)
  const [openAccentPickerKey, setOpenAccentPickerKey] = useState<string | null>(null)
  const [portfolioAccentColor, setPortfolioAccentColor] = useState(DEFAULT_PORTFOLIO_ACCENT_COLOR)
  const [draggingBenchmarkKey, setDraggingBenchmarkKey] = useState<string | null>(null)
  const [dragTarget, setDragTarget] = useState<DragTargetState | null>(null)
  const suppressToggleBenchmarkKeyRef = useRef<string | null>(null)
  const dashboardRootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem(PORTFOLIO_ACCENT_STORAGE_KEY)
    if (saved) {
      setPortfolioAccentColor(saved)
    }
  }, [])

  useEffect(() => {
    if (!openAccentPickerKey) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest('.benchmark-card-title-accent-shell')) {
        return
      }

      if (dashboardRootRef.current?.contains(target)) {
        setOpenAccentPickerKey(null)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenAccentPickerKey(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openAccentPickerKey])

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
  const chart = {
    ...rangeChart,
    lines: rangeChart.lines.map((line) => (
      line.benchmarkKey === 'portfolio'
        ? { ...line, color: portfolioAccentColor }
        : line
    )),
  }
  const chartColorMap = new Map(chart.lines.map((line) => [line.benchmarkKey, line.color]))

  async function persistBenchmarkDrafts(nextDrafts: BenchmarkDraft[]) {
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
        accentColor: getRecommendedBenchmarkAccentColor(normalizedTicker),
        isDefault: false,
        isEnabled: true,
        displayOrder: getNextBenchmarkDisplayOrder(benchmarkDrafts),
      },
    ])
  }

  async function handleBenchmarkToggle(benchmarkKey: string) {
    if (!spreadsheet || busyState !== 'idle' || draggingBenchmarkKey) {
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

  async function handleBenchmarkAccentChange(benchmarkKey: string, accentColor: string) {
    await persistBenchmarkDrafts(
      benchmarkDrafts.map((row) => (
        row.benchmarkKey === benchmarkKey
          ? { ...row, accentColor }
          : row
      )),
    )
    setOpenAccentPickerKey(null)
  }

  function handlePortfolioAccentChange(accentColor: string) {
    setPortfolioAccentColor(accentColor)
    window.localStorage.setItem(PORTFOLIO_ACCENT_STORAGE_KEY, accentColor)
    setOpenAccentPickerKey(null)
  }

  function buildUsedAccentColors(ownerKey: string) {
    const used = new Set<string>()

    if (ownerKey !== 'portfolio') {
      used.add(portfolioAccentColor)
    }

    benchmarkDrafts.forEach((draft) => {
      if (draft.benchmarkKey !== ownerKey) {
        used.add(draft.accentColor)
      }
    })

    return used
  }

  function renderAccentPalette(ownerKey: string, currentColor: string, onSelect: (color: string) => void) {
    const usedAccentColors = buildUsedAccentColors(ownerKey)

    return (
      <div
        className="benchmark-card-title-palette"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {BENCHMARK_ACCENT_PALETTE.map((color) => {
          const isCurrent = color === currentColor
          const isUsedElsewhere = usedAccentColors.has(color)

          return (
            <button
              key={`${ownerKey}-${color}`}
              className={[
                'benchmark-card-swatch',
                isCurrent ? 'benchmark-card-swatch-active' : '',
                isUsedElsewhere && !isCurrent ? 'benchmark-card-swatch-disabled' : '',
              ].filter(Boolean).join(' ')}
              type="button"
              onClick={() => onSelect(color)}
              disabled={isUsedElsewhere && !isCurrent}
              style={{ '--swatch-color': color } as CSSProperties}
              title={isUsedElsewhere && !isCurrent ? `${color} already in use` : color}
              aria-label={isUsedElsewhere && !isCurrent ? `${color} already in use` : `Use ${color}`}
            />
          )
        })}
      </div>
    )
  }

  function handleBenchmarkDragStart(event: DragEvent<HTMLElement>, benchmarkKey: string) {
    if (busyState !== 'idle') {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', benchmarkKey)
    setDraggingBenchmarkKey(benchmarkKey)
    setDragTarget({ benchmarkKey, placement: 'before' })
  }

  function handleBenchmarkDragOver(event: DragEvent<HTMLElement>, benchmarkKey: string) {
    if (!draggingBenchmarkKey || draggingBenchmarkKey === benchmarkKey) {
      return
    }

    event.preventDefault()
    const placement = getBenchmarkDropPlacement(event.clientY, event.currentTarget.getBoundingClientRect())
    setDragTarget({ benchmarkKey, placement })
  }

  async function handleBenchmarkDrop(event: DragEvent<HTMLElement>, benchmarkKey: string) {
    if (!draggingBenchmarkKey) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const placement = getBenchmarkDropPlacement(event.clientY, event.currentTarget.getBoundingClientRect())
    const nextKeys = buildReorderedBenchmarkKeys(
      benchmarkDrafts.map((row) => row.benchmarkKey),
      draggingBenchmarkKey,
      benchmarkKey,
      placement,
    )

    suppressToggleBenchmarkKeyRef.current = draggingBenchmarkKey
    setDraggingBenchmarkKey(null)
    setDragTarget(null)

    if (nextKeys.join('|') === benchmarkDrafts.map((row) => row.benchmarkKey).join('|')) {
      return
    }

    await persistBenchmarkDrafts(reorderBenchmarkDrafts(benchmarkDrafts, nextKeys))
  }

  function handleBenchmarkDragEnd() {
    if (draggingBenchmarkKey) {
      suppressToggleBenchmarkKeyRef.current = draggingBenchmarkKey
    }
    setDraggingBenchmarkKey(null)
    setDragTarget(null)
  }

  function renderBenchmarkCard(card: BenchmarkComparisonCard) {
    const isMuted = !card.isEnabled
    const toneClass = isMuted
      ? 'benchmark-card-tone-neutral'
      : card.value >= 0
        ? 'benchmark-card-tone-positive'
        : 'benchmark-card-tone-negative'
    const deltaClass = card.deltaFromPortfolio >= 0 ? 'benchmark-card-delta-positive' : 'benchmark-card-delta-negative'
    const returnClass = card.value >= 0 ? 'benchmark-card-return-positive' : 'benchmark-card-return-negative'
    const accentColor = chartColorMap.get(card.benchmarkKey) ?? card.accentColor
    const dropClass = dragTarget?.benchmarkKey === card.benchmarkKey
      ? dragTarget.placement === 'before'
        ? 'benchmark-card-drop-before'
        : 'benchmark-card-drop-after'
      : ''

    const statusClass = card.status === 'failed'
      ? 'benchmark-card-status-failed'
      : card.status === 'retrying'
        ? 'benchmark-card-status-loading'
        : card.caption === 'Disabled by you'
          ? 'benchmark-card-status-disabled'
          : 'benchmark-card-status-neutral'

    return (
      <article
        key={card.benchmarkKey}
        className={[
          'summary-card',
          'benchmark-card',
          toneClass,
          isMuted ? 'benchmark-card-disabled' : 'benchmark-card-enabled',
          draggingBenchmarkKey === card.benchmarkKey ? 'benchmark-card-dragging' : '',
          dropClass,
        ].filter(Boolean).join(' ')}
        style={{ '--benchmark-accent': accentColor } as CSSProperties}
        data-item-id={`benchmark-card-${card.benchmarkKey}`}
        draggable={busyState === 'idle'}
        onClick={() => {
          if (suppressToggleBenchmarkKeyRef.current === card.benchmarkKey) {
            suppressToggleBenchmarkKeyRef.current = null
            return
          }
          void handleBenchmarkToggle(card.benchmarkKey)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void handleBenchmarkToggle(card.benchmarkKey)
          }
        }}
        onDragStart={(event) => { handleBenchmarkDragStart(event, card.benchmarkKey) }}
        onDragOver={(event) => { handleBenchmarkDragOver(event, card.benchmarkKey) }}
        onDrop={(event) => { void handleBenchmarkDrop(event, card.benchmarkKey) }}
        onDragLeave={() => {
          if (dragTarget?.benchmarkKey === card.benchmarkKey) {
            setDragTarget(null)
          }
        }}
        onDragEnd={handleBenchmarkDragEnd}
        role="button"
        tabIndex={0}
        aria-pressed={card.isEnabled}
        aria-label={`${card.name} ${card.isEnabled ? 'disable benchmark' : 'enable benchmark'}`}
      >
        <span className="drag-insert-guide drag-insert-guide-before" aria-hidden="true" />
        <span className="drag-insert-guide drag-insert-guide-after" aria-hidden="true" />
        <div className="benchmark-card-grid benchmark-card-grid-benchmark">
          <div className="benchmark-card-title benchmark-card-title-main">
            <div
              className="benchmark-card-title-accent-shell"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                className="benchmark-card-title-accent-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenAccentPickerKey((current) => current === card.benchmarkKey ? null : card.benchmarkKey)
                }}
                aria-label={`Change ${card.name} accent color`}
                title="Accent color"
              >
                <span className="benchmark-card-title-accent-dot" style={{ backgroundColor: accentColor }} aria-hidden="true" />
              </button>
              {openAccentPickerKey === card.benchmarkKey
                ? renderAccentPalette(card.benchmarkKey, accentColor, (color) => { void handleBenchmarkAccentChange(card.benchmarkKey, color) })
                : null}
            </div>
            <span className="benchmark-card-title-text">{card.name}</span>
            {!card.isDefault ? (
              <button
                className="icon-button benchmark-card-title-delete"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleBenchmarkDelete(card.benchmarkKey)
                }}
                disabled={!spreadsheet || busyState !== 'idle'}
                title="Delete benchmark"
                aria-label={`Delete ${card.name}`}
              >
                <DeleteIcon />
              </button>
            ) : null}
          </div>
          <span className={['benchmark-card-status', statusClass, card.caption ? '' : 'benchmark-card-status-empty'].filter(Boolean).join(' ')}>
            {card.caption || '\u00A0'}
          </span>
          <strong className={['benchmark-card-return-value', 'benchmark-card-return-main', returnClass].join(' ')}>
            {card.value >= 0 ? '+' : ''}{card.value.toFixed(2)}%
          </strong>
          <span className="benchmark-card-delta-label benchmark-card-delta-label-main">vs Port.</span>
          <strong className={['benchmark-card-delta-value', 'benchmark-card-delta-main', deltaClass].join(' ')}>
            {card.deltaFromPortfolio >= 0 ? '+' : ''}{card.deltaFromPortfolio.toFixed(2)}%p
          </strong>
        </div>
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
    <div className="page-stack" ref={dashboardRootRef}>
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

        <div className="summary-grid benchmark-summary-grid centered-fixed-card-grid fixed-grid-280-4-3-2-1">
          <article
            className="summary-card benchmark-card summary-card-accent benchmark-portfolio-card benchmark-card-static"
            style={{ '--benchmark-accent': portfolioAccentColor } as CSSProperties}
          >
            <div className="benchmark-card-grid benchmark-card-grid-benchmark">
              <div className="benchmark-card-title benchmark-card-title-main">
                <div
                  className="benchmark-card-title-accent-shell"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    className="benchmark-card-title-accent-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenAccentPickerKey((current) => current === 'portfolio' ? null : 'portfolio')
                    }}
                    aria-label="Change portfolio accent color"
                    title="Accent color"
                  >
                    <span className="benchmark-card-title-accent-dot benchmark-card-title-accent-dot-static" style={{ backgroundColor: portfolioAccentColor }} aria-hidden="true" />
                  </button>
                  {openAccentPickerKey === 'portfolio'
                    ? renderAccentPalette('portfolio', portfolioAccentColor, handlePortfolioAccentChange)
                    : null}
                </div>
                <span className="benchmark-card-title-text">Portfolio</span>
              </div>
              <span className="benchmark-card-status benchmark-card-status-empty">{'\u00A0'}</span>
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

        <DashboardComparisonChart chart={chart} />
      </SectionCard>
    </div>
  )
}
