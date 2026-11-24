import type { ReactNode } from 'react'
import { Compass } from '@/components/site/compass'

export function PageHeading({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children?: ReactNode
}) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <Compass className="size-9 shrink-0 text-sea-deep" />
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-widest text-sea-teal uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-4xl leading-none text-sea-deep sm:text-5xl">{title}</h1>
        </div>
      </div>
      {children ? <div className="mt-3 max-w-2xl text-ink/80">{children}</div> : null}
      <div className="wave-divider mt-4" aria-hidden />
    </header>
  )
}
