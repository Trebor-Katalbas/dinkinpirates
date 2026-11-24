import { cn } from '@/lib/utils'

/** Original ship's-wheel ornament (inline SVG, no request). */
export function ShipWheel({ className }: { className?: string }) {
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45)
  return (
    <svg viewBox="-60 -60 120 120" className={cn('text-treasure-gold', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {spokes.map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line x1="0" y1="-8" x2="0" y2="-50" strokeWidth="5" />
            <line x1="0" y1="-44" x2="0" y2="-56" strokeWidth="9" />
          </g>
        ))}
        <circle r="36" strokeWidth="7" />
        <circle r="30" strokeWidth="2" opacity="0.6" />
      </g>
      <circle r="11" fill="currentColor" />
      <circle r="4" fill="var(--color-umber)" />
    </svg>
  )
}
