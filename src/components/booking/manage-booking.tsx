'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, CalendarClock, Link2, Loader2, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingLoadError, StatusBadge, TypeBadge } from '@/components/booking/booking-states'
import { BookingSummary } from '@/components/booking/booking-summary'
import { bookingQuery, useBooking, type BookingWithCourt } from '@/components/booking/queries'
import { SlotPicker } from '@/components/booking/slot-picker'
import type { SlotSelection } from '@/components/booking/slot-utils'
import { sendJSON } from '@/components/site/fetch-json'
import { useNow } from '@/components/site/use-now'
import { ShareLinks } from '@/components/voyage/share-links'
import { RECLUB_FOOTNOTE, VerifiedBookingBadge } from '@/components/voyage/verified-badge'
import {
  ReclubUrlField,
  VisibilityToggle,
  VoyageTitleField,
  checkReclubInput,
} from '@/components/voyage/voyage-fields'
import { isPublicVoyageLive } from '@/lib/voyage'
import type { BookingDTO, VoyageVisibility } from '@/types'

type PatchBody =
  | { action: 'reschedule'; date: string; startTime: string; hours: number }
  | { action: 'cancel' }
  | { action: 'setReclub'; reclubUrl: string }
  | { action: 'removeReclub' }
  | { action: 'setVisibility'; visibility: VoyageVisibility }
  | { action: 'setTitle'; voyageTitle: string }

function usePatchBooking(id: string, successMessage: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatchBody) =>
      sendJSON<BookingDTO>(`/api/bookings/${encodeURIComponent(id)}`, 'PATCH', body),
    onSuccess: async (updated) => {
      queryClient.setQueryData<BookingWithCourt>(bookingQuery(id).queryKey, (old) =>
        old ? { ...old, ...updated } : old,
      )
      toast.success(successMessage)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['voyages'] }),
        queryClient.invalidateQueries({ queryKey: ['slots'] }),
      ])
    },
    onError: (err) => toast.error(err.message),
  })
}

function hoursOf(b: BookingDTO): number {
  return Math.max(1, Math.round((Date.parse(b.endAt) - Date.parse(b.startAt)) / 3_600_000))
}

function RescheduleSection({ b }: { b: BookingWithCourt }) {
  const [open, setOpen] = useState(false)
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const patch = usePatchBooking(b.id, 'Booking rescheduled')

  if (!open) {
    return (
      <Button variant="outline" className="tap bg-white/70" onClick={() => setOpen(true)}>
        <CalendarClock aria-hidden />
        Reschedule
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-ink/15 bg-white/50 p-4">
      <p className="text-sm text-ink/75">
        Pick a new time on {b.court.name}. Your current slot shows as booked until you move.
      </p>
      <SlotPicker fixedCourtId={b.courtId} initialHours={hoursOf(b)} onChange={setSelection} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="tap"
          disabled={!selection || patch.isPending}
          onClick={() => {
            if (!selection) return
            patch.mutate(
              {
                action: 'reschedule',
                date: selection.date,
                startTime: selection.startTime,
                hours: selection.hours,
              },
              { onSuccess: () => setOpen(false) },
            )
          }}
        >
          {patch.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Confirm new time
        </Button>
        <Button variant="ghost" className="tap" onClick={() => setOpen(false)}>
          Keep current time
        </Button>
      </div>
    </div>
  )
}

function TitleSection({ b }: { b: BookingWithCourt }) {
  const [title, setTitle] = useState(b.voyageTitle ?? '')
  const patch = usePatchBooking(b.id, 'Title saved')
  const dirty = title.trim() !== (b.voyageTitle ?? '')
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        patch.mutate({ action: 'setTitle', voyageTitle: title.trim() })
      }}
    >
      <VoyageTitleField value={title} onChange={setTitle} />
      <Button
        type="submit"
        variant="outline"
        className="tap bg-white/70"
        disabled={!dirty || patch.isPending}
      >
        {patch.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Save title
      </Button>
    </form>
  )
}

function ReclubSection({ b }: { b: BookingWithCourt }) {
  const [editing, setEditing] = useState(!b.reclubUrl)
  const [value, setValue] = useState('')
  const set = usePatchBooking(b.id, b.reclubUrl ? 'Reclub link replaced' : 'Reclub link attached')
  const remove = usePatchBooking(b.id, 'Reclub link removed')
  const check = checkReclubInput(value)

  return (
    <div className="space-y-3">
      {b.reclubUrl ? (
        <div className="rounded-lg border border-ink/15 bg-white/60 p-3">
          <p className="text-xs font-semibold text-ink/60 uppercase">Attached Reclub link</p>
          <p className="mt-1 flex items-start gap-2 text-sm break-all">
            <Link2 className="mt-0.5 size-4 shrink-0 text-sea-teal" aria-hidden />
            {b.reclubUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!editing ? (
              <Button
                variant="outline"
                className="tap bg-white/70"
                onClick={() => setEditing(true)}
              >
                Replace link
              </Button>
            ) : null}
            <Button
              variant="destructive"
              className="tap"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ action: 'removeReclub' })}
            >
              {remove.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Trash2 aria-hidden />
              )}
              Remove link
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/75">
          No Reclub link attached. Add one to list this voyage on the Dock.
        </p>
      )}
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!check.url) return
            set.mutate(
              { action: 'setReclub', reclubUrl: check.url },
              {
                onSuccess: () => {
                  setValue('')
                  setEditing(false)
                },
              },
            )
          }}
        >
          <ReclubUrlField
            value={value}
            onChange={setValue}
            label={b.reclubUrl ? 'New Reclub link' : 'Reclub open-play link'}
            optional={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="tap" disabled={!check.url || set.isPending}>
              {set.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {b.reclubUrl ? 'Replace link' : 'Attach link'}
            </Button>
            {b.reclubUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="tap"
                onClick={() => {
                  setValue('')
                  setEditing(false)
                }}
              >
                Never mind
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  )
}

function VisibilitySection({ b }: { b: BookingWithCourt }) {
  const patch = usePatchBooking(b.id, 'Visibility updated')
  const vars = patch.isPending ? patch.variables : undefined
  // Optimistically reflect the pending value while the PATCH is in flight.
  const visibility = vars?.action === 'setVisibility' ? vars.visibility : b.voyageVisibility
  const checked = visibility === 'public'
  return (
    <VisibilityToggle
      checked={checked}
      disabled={patch.isPending}
      onCheckedChange={(v) =>
        patch.mutate({ action: 'setVisibility', visibility: v ? 'public' : 'private' })
      }
    />
  )
}

function CancelSection({ b }: { b: BookingWithCourt }) {
  const [open, setOpen] = useState(false)
  const patch = usePatchBooking(b.id, 'Booking cancelled')
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="tap">
          <XCircle aria-hidden />
          Cancel booking
        </Button>
      </DialogTrigger>
      <DialogContent className="parchment">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-sea-deep">
            Cancel this booking?
          </DialogTitle>
          <DialogDescription className="text-ink/80">
            The court will be released for others to claim.
            {b.type === 'voyage'
              ? ' Cancelling also hides the public voyage from the Dock immediately and stops Reclub link DMs from our Facebook page.'
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="tap">
              Keep booking
            </Button>
          </DialogClose>
          <Button
            className="tap bg-bounty-red text-parchment hover:bg-bounty-red/90"
            disabled={patch.isPending}
            onClick={() => patch.mutate({ action: 'cancel' }, { onSuccess: () => setOpen(false) })}
          >
            {patch.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Yes, cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ManageBooking({ id }: { id: string }) {
  const q = useBooking(id)
  const now = useNow()

  if (q.isPending || now === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (q.isError) return <BookingLoadError error={q.error} callbackUrl={`/bookings/${id}`} />

  const b = q.data
  const editable = (b.status === 'confirmed' || b.status === 'pending') && Date.parse(b.endAt) > now
  const live = isPublicVoyageLive(b, new Date(now))

  return (
    <div className="space-y-6">
      <Link
        href="/bookings"
        className="tap inline-flex items-center gap-1 text-sm text-sea-teal underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My Bookings
      </Link>

      <section className="wanted-poster space-y-4 p-5" aria-labelledby="booking-heading">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={b.type} />
          <StatusBadge status={b.status} />
          {b.status === 'confirmed' || b.status === 'completed' ? <VerifiedBookingBadge /> : null}
        </div>
        <h1 id="booking-heading" className="font-display text-4xl leading-none text-sea-deep">
          {b.type === 'voyage' && b.voyageTitle ? b.voyageTitle : b.court.name}
        </h1>
        <BookingSummary court={b.court} startAt={b.startAt} endAt={b.endAt} />
        {editable ? <RescheduleSection key={`${b.startAt}-${b.endAt}`} b={b} /> : null}
        {!editable && b.status !== 'cancelled' ? (
          <p className="text-sm text-ink/70">
            This booking has ended and can no longer be changed.
          </p>
        ) : null}
        {b.status === 'cancelled' ? (
          <p className="text-sm text-bounty-red">
            This booking was cancelled
            {b.type === 'voyage' ? ' and its voyage is no longer listed' : ''}.
          </p>
        ) : null}
      </section>

      {b.type === 'voyage' && editable ? (
        <Card className="bg-white/60">
          <CardHeader>
            <CardTitle className="font-heading text-2xl text-sea-deep">Open Voyage</CardTitle>
            <CardDescription>{RECLUB_FOOTNOTE}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TitleSection key={b.voyageTitle ?? ''} b={b} />
            <ReclubSection key={b.reclubUrl ?? 'none'} b={b} />
            <VisibilitySection b={b} />
            {live ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-sea-deep">Share this voyage</p>
                <ShareLinks bookingId={b.id} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {b.type === 'charter' && editable ? (
        <p className="text-sm text-ink/70">
          Private Charters are never listed publicly and have no Reclub link.
        </p>
      ) : null}

      {editable ? (
        <section
          aria-labelledby="danger-heading"
          className="rounded-xl border border-bounty-red/30 p-4"
        >
          <h2 id="danger-heading" className="mb-2 font-semibold text-bounty-red">
            Abandon ship
          </h2>
          <CancelSection b={b} />
        </section>
      ) : null}
    </div>
  )
}
