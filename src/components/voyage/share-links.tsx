'use client'

import { useMutation } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Copy, Loader2, MessageCircle, QrCode, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendJSON } from '@/components/site/fetch-json'
import { goPath } from '@/lib/voyage'
import type { ClickSource } from '@/types'

const noopSubscribe = () => () => {}

function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  )
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Could not copy — select the link and copy it manually.')
  }
}

const LINKS: { src: ClickSource; label: string; done: string; icon: typeof Copy }[] = [
  { src: 'fb', label: 'Copy link', done: 'Link', icon: Copy },
  { src: 'messenger', label: 'Copy Messenger link', done: 'Messenger link', icon: MessageCircle },
  { src: 'qr', label: 'Copy QR link', done: 'QR link', icon: QrCode },
]

/** Share controls for a live public voyage: Facebook page post + attributed /go links. */
export function ShareLinks({ bookingId }: { bookingId: string }) {
  const origin = useOrigin()
  const fbPost = useMutation({
    mutationFn: () =>
      sendJSON<{ postId: string }>(`/api/voyages/${encodeURIComponent(bookingId)}/fb-post`, 'POST'),
    onSuccess: () => toast.success('Shared to our Facebook page. Comment LINK to get it by DM.'),
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={() => fbPost.mutate()}
        disabled={fbPost.isPending}
        className="tap w-full bg-sea-deep text-base text-parchment"
      >
        {fbPost.isPending ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Share2 aria-hidden />
        )}
        Share to Facebook
      </Button>
      <div className="grid gap-2 sm:grid-cols-3">
        {LINKS.map(({ src, label, done, icon: Icon }) => (
          <Button
            key={src}
            type="button"
            variant="outline"
            className="tap bg-white/70"
            onClick={() => void copy(`${window.location.origin}${goPath(bookingId, src)}`, done)}
          >
            <Icon aria-hidden />
            {label}
          </Button>
        ))}
      </div>
      <p className="rounded-lg bg-white/60 px-3 py-2 font-mono text-xs break-all text-ink/75">
        {origin}
        {goPath(bookingId, 'fb')}
      </p>
    </div>
  )
}
