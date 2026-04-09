import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description: string
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  )
}
