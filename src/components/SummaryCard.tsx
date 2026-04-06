import type { ReactNode } from 'react'

interface SummaryCardProps {
  title: string
  value: string
  caption: string
  tone?: 'neutral' | 'positive' | 'negative'
  icon?: ReactNode
}

export function SummaryCard({
  title,
  value,
  caption,
  tone = 'neutral',
  icon,
}: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card-${tone}`}>
      <div className="summary-card-head">
        <p>{title}</p>
        {icon ? <span className="summary-icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      <span>{caption}</span>
    </article>
  )
}
