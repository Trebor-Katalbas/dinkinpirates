import { cn } from '@/lib/utils'

/** Simple original compass-rose motif. Decorative. */
export function Compass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-8', className)} aria-hidden focusable="false">
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle
        cx="32"
        cy="32"
        r="23"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
      <path d="M32 4 L37 32 L32 60 L27 32 Z" fill="currentColor" opacity="0.9" />
      <path d="M4 32 L32 27 L60 32 L32 37 Z" fill="currentColor" opacity="0.55" />
      <path d="M32 4 L37 32 L32 32 Z" fill="var(--color-bounty-red)" />
      <circle cx="32" cy="32" r="3" fill="var(--color-treasure-gold)" />
    </svg>
  )
}
