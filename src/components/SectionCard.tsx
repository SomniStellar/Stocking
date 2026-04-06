import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description: string
  actionLabel?: string
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  actionLabel,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {actionLabel ? <button className="ghost-button">{actionLabel}</button> : null}
      </div>
      <div>{children}</div>
    </section>
  )
}
