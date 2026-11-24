import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** We verify the court booking only — never the open play itself. */
export function VerifiedBookingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-sea-teal/40 bg-sea-teal/10 px-2.5 py-0.5 text-xs font-semibold text-sea-teal',
        className,
      )}
    >
      <ShieldCheck className="size-3.5" aria-hidden />
      Verified court booking
    </span>
  )
}

export const RECLUB_FOOTNOTE = 'Roster, slots, and availability are managed on Reclub.'
