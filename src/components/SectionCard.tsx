import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  )
}