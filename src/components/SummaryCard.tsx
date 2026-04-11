import type { ReactNode } from 'react'

interface SummaryCardProps {
  title: string
  value: string
  caption?: string
  tone?: 'neutral' | 'positive' | 'negative' | 'accent'
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function SummaryCard({
  title,
  value,
  caption,
  tone = 'neutral',
  icon,
  actions,
  className,
}: SummaryCardProps) {
  const classNames = ['summary-card', `summary-card-${tone}`, className].filter(Boolean).join(' ')

  return (
    <article className={classNames}>
      <div className="summary-card-head">
        <p>{title}</p>
        <div className="summary-card-head-actions">
          {actions ? <span>{actions}</span> : null}
          {icon ? <span className="summary-icon">{icon}</span> : null}
        </div>
      </div>
      <strong>{value}</strong>
      {caption ? <span>{caption}</span> : null}
    </article>
  )
}
