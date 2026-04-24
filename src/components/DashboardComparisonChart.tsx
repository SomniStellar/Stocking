import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardRangeChartModel } from '../types/domain'

interface DashboardComparisonChartProps {
  chart: DashboardRangeChartModel
}

interface ChartTooltipPayloadEntry {
  color?: string
  dataKey?: unknown
  name?: unknown
  payload?: {
    pointDate?: string
    label?: string
  }
  value?: unknown
}

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: readonly ChartTooltipPayloadEntry[]
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function toChartNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function ComparisonTooltip({
  active,
  label,
  payload,
  chart,
}: ChartTooltipProps & { chart: DashboardRangeChartModel }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const point = payload[0]?.payload
  const valueMap = new Map(
    payload
      .filter((entry) => entry.dataKey)
      .map((entry) => [String(entry.dataKey), toChartNumber(entry.value as string | number | undefined)]),
  )

  const rows = chart.lines.filter((line) => valueMap.has(line.benchmarkKey))

  return (
    <div className="benchmark-chart-tooltip">
      <p className="benchmark-chart-tooltip-date">{point?.pointDate || label || '-'}</p>
      <div className="benchmark-chart-tooltip-values">
        {rows.map((line) => (
          <div key={line.benchmarkKey} className="benchmark-chart-tooltip-row">
            <span className="benchmark-chart-tooltip-name">
              <span
                className="benchmark-chart-tooltip-dot"
                style={{ backgroundColor: line.color }}
                aria-hidden="true"
              />
              {line.name}
            </span>
            <strong className="benchmark-chart-tooltip-value">
              {formatPercent(valueMap.get(line.benchmarkKey) ?? 0)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardComparisonChart({
  chart,
}: DashboardComparisonChartProps) {
  if (!chart.hasData) {
    return (
      <div className="benchmark-chart-shell">
        <div className="benchmark-chart-head">
          <div>
            <strong>Performance Trend</strong>
            <p>Selected range: {chart.period}</p>
          </div>
          <span className="badge badge-muted">Syncing chart data</span>
        </div>
        <div className="empty-note benchmark-chart-empty">{chart.emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className="benchmark-chart-shell">
      <div className="benchmark-chart-head">
        <div>
          <strong>Performance Trend</strong>
          <p>Portfolio and active benchmarks for the selected range.</p>
        </div>
        <span className="badge badge-muted">Range: {chart.period}</span>
      </div>

      <div className="benchmark-chart-frame">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chart.points} margin={{ top: 12, right: 8, bottom: 8, left: -20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              minTickGap={24}
              tickMargin={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'rgba(245, 239, 226, 0.72)', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'rgba(245, 239, 226, 0.66)', fontSize: 12 }}
              width={52}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255, 210, 138, 0.45)', strokeWidth: 1 }}
              content={(props) => <ComparisonTooltip {...props} chart={chart} />}
            />
            {chart.lines.map((line) => (
              <Line
                key={line.benchmarkKey}
                type="monotone"
                dataKey={line.benchmarkKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={line.isPortfolio ? 3 : 2}
                dot={false}
                activeDot={{ r: 6, stroke: '#0d1118', strokeWidth: 2, fill: line.color }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
