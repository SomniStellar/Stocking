import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: string
  titleActions?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  titleActions,
  actions,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card-head">
        <div className="section-card-title-group">
          <div className="section-card-title-row">
            <h3>{title}</h3>
            {titleActions ? <div className="section-card-title-actions">{titleActions}</div> : null}
          </div>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  )
}
