import type { ReactNode } from 'react'

interface SectionCardProps {
  className?: string
  title: string
  description?: string
  titleActions?: ReactNode
  actions?: ReactNode
  headClassName?: string
  bodyClassName?: string
  children: ReactNode
}

export function SectionCard({
  className,
  title,
  description,
  titleActions,
  actions,
  headClassName,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <section className={['section-card', className].filter(Boolean).join(' ')}>
      <div className={['section-card-head', headClassName].filter(Boolean).join(' ')}>
        <div className="section-card-title-group">
          <div className="section-card-title-row">
            <h3>{title}</h3>
            {titleActions ? <div className="section-card-title-actions">{titleActions}</div> : null}
          </div>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
