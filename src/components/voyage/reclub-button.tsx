'use client'

import { useState, type MouseEvent, type ReactNode } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Compass } from '@/components/site/compass'
import { cn } from '@/lib/utils'

const INTERSTITIAL_MS = 900

/**
 * "View on Reclub" link to a /go/{id}?src=… redirect. On desktop (fine pointer) it shows a short
 * "Opening Reclub…" interstitial before navigating; on touch devices it navigates directly so
 * universal links can open the Reclub app.
 */
export function ReclubButton({
  href,
  children = 'View on Reclub',
  className,
}: {
  href: string
  children?: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    e.preventDefault()
    setOpen(true)
    window.setTimeout(() => window.location.assign(href), INTERSTITIAL_MS)
  }

  return (
    <>
      <a
        href={href}
        onClick={onClick}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-treasure-gold px-4 font-semibold text-sea-deep shadow-sm transition-colors outline-none',
          'hover:bg-treasure-gold/90 focus-visible:ring-3 focus-visible:ring-sea-deep/60',
          className,
        )}
      >
        {children}
        <ExternalLink className="size-4" aria-hidden />
      </a>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="parchment text-center">
          <DialogHeader className="items-center">
            <Compass className="size-14 animate-spin text-sea-deep [animation-duration:3s] motion-reduce:animate-none" />
            <DialogTitle className="font-display text-3xl text-sea-deep">
              Opening Reclub…
            </DialogTitle>
            <DialogDescription>
              Roster, slots, and availability are managed on Reclub.
            </DialogDescription>
          </DialogHeader>
          <p className="flex items-center justify-center gap-2 text-sm text-ink/70">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <a href={href} className="underline underline-offset-4">
              Continue if nothing happens
            </a>
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
