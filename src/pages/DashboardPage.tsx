import { useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { SummaryCard } from '../components/SummaryCard'
import { buildBenchmarkComparisonCards, buildBenchmarkRows, createComparisonPeriodLabel, validateBenchmarkRows } from '../data/benchmarkData'
import { buildHoldingRows, buildMonitorRows, buildWatchlistRows } from '../data/sheetData'
import type { ComparisonPeriod } from '../types/domain'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

const COMPARISON_PERIODS: ComparisonPeriod[] = ['YTD', '1Y', '3Y', '5Y']

export function DashboardPage() {
  const { session, spreadsheet, envConfigured, snapshot } = useGoogleWorkspace()
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('YTD')

  const monitorRows = buildMonitorRows(snapshot)
  const holdings = buildHoldingRows(snapshot)
  const watchlists = buildWatchlistRows(snapshot)
  const benchmarks = buildBenchmarkRows(snapshot)
  const benchmarkValidation = validateBenchmarkRows(benchmarks)
  const comparisonCards = buildBenchmarkComparisonCards(snapshot, holdings, comparisonPeriod)

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

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Snapshot-driven workspace</p>
          <h1>Portfolio monitoring MVP</h1>
          <p className="hero-copy">
            Track current holdings and watchlists with Google Sheets as the single portfolio snapshot source.
          </p>
        </div>
        <div className="hero-aside hero-aside-stack">
          <span>Auth</span>
          <strong>{session ? session.profile.email : 'Not connected'}</strong>
          <span>Sheet</span>
          <strong>{spreadsheet ? spreadsheet.title : envConfigured ? 'Create your template in Settings' : 'Client ID required'}</strong>
        </div>
      </section>

      <section className="summary-grid">
        <SummaryCard title="Holdings Value" value={`$${totalValue.toFixed(2)}`} caption="Based on previous close" tone="neutral" />
        <SummaryCard title="Invested Cost" value={`$${totalInvested.toFixed(2)}`} caption="Current holdings snapshot" tone="neutral" />
        <SummaryCard title="Unrealized P/L" value={`$${totalProfit.toFixed(2)}`} caption={`${totalYield.toFixed(2)}% return`} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
        <SummaryCard title="Watchlists" value={`${watchlists.length}`} caption="Favorites and ideas" tone="neutral" />
      </section>

      <SectionCard
        title="Benchmark Comparison"
        description="Configured benchmark targets compared to the current portfolio composition."
        actions={
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
        }
      >
        {benchmarkValidationCaption ? (
          <div className="message-box message-box-neutral benchmark-inline-note">{benchmarkValidationCaption}</div>
        ) : null}

        {comparisonCards.length === 0 ? (
          <div className="empty-note">No enabled benchmark rows yet. Add benchmark targets in the Benchmarks tab.</div>
        ) : (
          <div className="summary-grid benchmark-summary-grid">
            {comparisonCards.map((card) => (
              <SummaryCard
                key={card.benchmarkKey}
                title={card.name}
                value={`${card.value >= 0 ? '+' : ''}${card.value.toFixed(2)}%`}
                caption={card.caption || `Portfolio diff ${card.deltaFromPortfolio >= 0 ? '+' : ''}${card.deltaFromPortfolio.toFixed(2)}%p`}
                tone={card.status === 'failed' ? 'neutral' : card.value >= 0 ? 'positive' : 'negative'}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <div className="content-grid">
        <SectionCard title="Current Holdings" description="Snapshot rows from the Holdings sheet.">
          <div className="mini-table">
            {holdings.length === 0 ? (
              <div className="empty-note">No holdings rows yet. Add current positions to the Holdings tab.</div>
            ) : (
              holdings.map((row) => (
                <div key={row.ticker} className="mini-row">
                  <div>
                    <strong>{row.ticker}</strong>
                    <span>{row.name}</span>
                  </div>
                  <div>
                    <strong>${row.marketValue.toFixed(2)}</strong>
                    <span className={row.unrealizedReturn >= 0 ? 'text-positive' : 'text-negative'}>
                      {row.unrealizedReturn.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Watchlist Coverage" description="Favorites and ideas are unified in the Watchlists sheet.">
          <ul className="check-list">
            <li>{watchlists.length} watchlist rows loaded</li>
            <li>{monitorRows.length} monitor rows loaded</li>
            <li>{benchmarks.length} benchmark rows loaded</li>
            <li>{spreadsheet ? 'Template spreadsheet connected' : 'Template spreadsheet creation pending'}</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
