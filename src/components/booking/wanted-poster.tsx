import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface WantedPosterProps {
  title: string
  subtitle: string
  /** Small line under the title, e.g. "Bounty: 1 court" — purely decorative copy. */
  bounty?: string
  href: string
  children?: ReactNode
  className?: string
  /** Optional illustration under the WANTED band (e.g. a 3D scene slot). */
  art?: ReactNode
}

/**
 * Wanted-poster styled link card. Server-safe (no client hooks) so it can be used on the
 * Dock landing page as well as inside client components.
 */
export function WantedPoster({
  title,
  subtitle,
  bounty,
  href,
  children,
  className,
  art,
}: WantedPosterProps) {
  return (
    <Link
      href={href}
      className={cn(
        'wanted-poster group block text-center transition-transform outline-none',
        'hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-treasure-gold focus-visible:ring-offset-2 focus-visible:ring-offset-parchment',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <p
        className="-mx-6 -mt-8 bg-umber pt-4 pb-2 font-display text-2xl tracking-[0.35em] text-paper uppercase"
        aria-hidden
      >
        Wanted
      </p>
      {art}
      <h3 className="manga-title mt-4 text-4xl sm:text-5xl">{title}</h3>
      <p className="mt-2 text-sm text-ink/80">{subtitle}</p>
      {children ? <div className="mt-4 text-left text-sm text-ink/90">{children}</div> : null}
      {bounty ? (
        <p className="mt-4 border-t border-dashed border-ink/40 pt-3 font-display text-2xl text-ink">
          {bounty}
        </p>
      ) : null}
      <span className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-treasure-gold px-4 font-semibold text-sea-deep shadow-sm transition-colors group-hover:bg-treasure-gold/90">
        Set sail
        <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  )
}
