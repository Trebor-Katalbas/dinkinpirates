'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, useSyncExternalStore, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingSummary } from '@/components/booking/booking-summary'
import { useCourts } from '@/components/booking/queries'
import { SlotPicker } from '@/components/booking/slot-picker'
import type { SlotSelection } from '@/components/booking/slot-utils'
import { WantedPoster } from '@/components/booking/wanted-poster'
import { ApiError, sendJSON } from '@/components/site/fetch-json'
import { signInHref } from '@/components/site/safe-callback'
import {
  ReclubUrlField,
  VisibilityToggle,
  VoyageTitleField,
  checkReclubInput,
} from '@/components/voyage/voyage-fields'
import { cn } from '@/lib/utils'
import type { BookingDTO, BookingType } from '@/types'

const DRAFT_KEY = 'dp:book-draft'

interface Draft {
  type: BookingType
  selection: SlotSelection
  reclubUrl: string
  title: string
  isPublic: boolean
}

const TYPE_LABEL: Record<BookingType, string> = {
  charter: 'Private Charter',
  voyage: 'Open Voyage',
}

export function BookFlow() {
  const params = useSearchParams()
  const raw = params.get('type')
  const type: BookingType | null = raw === 'charter' || raw === 'voyage' ? raw : null
  if (!type) return <TypeChooser />
  return <BookingWizard key={type} type={type} resume={params.get('resume') === '1'} />
}

function TypeChooser() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <WantedPoster
        title="Private Charter"
        subtitle="Reserve a court for your own crew. Never listed publicly."
        bounty="Your court, your crew"
        href="/book?type=charter"
      />
      <WantedPoster
        title="Open Voyage"
        subtitle="Reserve a court and attach your Reclub open-play link so others can find it."
        bounty="Court + Reclub link"
        href="/book?type=voyage"
      />
    </div>
  )
}

function Steps({ step }: { step: 1 | 2 }) {
  const items = ['Court & time', 'Details']
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Booking progress">
      {items.map((label, i) => {
        const n = i + 1
        const current = n === step
        const done = n < step
        return (
          <li
            key={label}
            className="flex items-center gap-2"
            aria-current={current ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border-2 font-semibold',
                current && 'border-sea-deep bg-sea-deep text-parchment',
                done && 'border-sea-teal bg-sea-teal text-parchment',
                !current && !done && 'border-ink/30 text-ink/60',
              )}
            >
              {n}
            </span>
            <span className={cn(current ? 'font-semibold text-sea-deep' : 'text-ink/60')}>
              {label}
            </span>
            {n < items.length ? <span className="mx-1 h-px w-6 bg-ink/30" aria-hidden /> : null}
          </li>
        )
      })}
    </ol>
  )
}

const noopSubscribe = () => () => {}

function parseDraft(raw: string | null, type: BookingType): Draft | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Draft
    return d.type === type && d.selection ? d : null
  } catch {
    return null
  }
}

function BookingWizard({ type, resume }: { type: BookingType; resume: boolean }) {
  // Draft saved before a sign-in redirect (client-only; null during server render).
  const rawDraft = useSyncExternalStore(
    noopSubscribe,
    () => (resume ? sessionStorage.getItem(DRAFT_KEY) : null),
    () => null,
  )
  const draft = parseDraft(rawDraft, type)
  return <WizardSteps key={draft ? 'resumed' : 'fresh'} type={type} draft={draft} />
}

function WizardSteps({ type, draft }: { type: BookingType; draft: Draft | null }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, status } = useSession()
  const courts = useCourts()

  const [step, setStep] = useState<'slot' | 'details'>(draft ? 'details' : 'slot')
  const [selection, setSelection] = useState<SlotSelection | null>(draft?.selection ?? null)
  const [reclubUrl, setReclubUrl] = useState(draft?.reclubUrl ?? '')
  const [title, setTitle] = useState(draft?.title ?? '')
  const [isPublic, setIsPublic] = useState(draft?.isPublic ?? true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const onSlotChange = useCallback((sel: SlotSelection | null) => {
    setSelection(sel)
    if (sel) setConflict(null)
  }, [])

  const reclub = checkReclubInput(reclubUrl)

  function goToSignIn(sel: SlotSelection) {
    const draft: Draft = { type, selection: sel, reclubUrl, title, isPublic }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    router.push(signInHref(`/book?type=${type}&resume=1`))
  }

  const create = useMutation({
    mutationFn: (sel: SlotSelection) =>
      sendJSON<BookingDTO>('/api/bookings', 'POST', {
        courtId: sel.courtId,
        date: sel.date,
        startTime: sel.startTime,
        hours: sel.hours,
        type,
        ...(type === 'voyage'
          ? {
              reclubUrl: reclub.url ?? undefined,
              voyageTitle: title.trim() || undefined,
              // The API only accepts "public" when a Reclub link is attached.
              voyageVisibility: isPublic && reclub.url ? 'public' : 'private',
            }
          : {}),
      }),
    onSuccess: async (booking) => {
      sessionStorage.removeItem(DRAFT_KEY)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['slots'] }),
        queryClient.invalidateQueries({ queryKey: ['voyages'] }),
      ])
      router.push(`/bookings/${encodeURIComponent(booking.id)}/confirmed`)
    },
    onError: (err, sel) => {
      if (err instanceof ApiError && err.status === 401) return goToSignIn(sel)
      // Someone else claimed the court between picking and submitting: go back to times.
      if (err instanceof ApiError && err.status === 409 && /already booked/i.test(err.message)) {
        const name = courts.data?.find((c) => c.id === sel.courtId)?.name ?? 'That court'
        setConflict(
          `${name} was claimed by another crew moments ago. Times are refreshed — pick another slot.`,
        )
        setSelection(null)
        setStep('slot')
        void queryClient.invalidateQueries({ queryKey: ['slots'] })
        void queryClient.invalidateQueries({ queryKey: ['availability'] })
        toast.warning('That slot was just claimed. Pick another time.')
        return
      }
      const msg = err.message || 'Could not claim that court.'
      setSubmitError(msg)
      toast.error(msg)
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selection) return
    if (type === 'voyage' && reclub.error) return
    setSubmitError(null)
    if (status === 'unauthenticated') return goToSignIn(selection)
    create.mutate(selection)
  }

  const court = courts.data?.find((c) => c.id === selection?.courtId)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-sea-deep px-3 py-1 text-sm font-semibold text-parchment">
          {TYPE_LABEL[type]}
        </p>
        <Link
          href="/book"
          className="tap inline-flex items-center text-sm text-sea-teal underline-offset-4 hover:underline"
        >
          Switch booking type
        </Link>
      </div>
      <Steps step={step === 'slot' ? 1 : 2} />

      {step === 'slot' ? (
        <section aria-labelledby="slot-heading" className="space-y-6">
          <h2 id="slot-heading" className="sr-only">
            Court and time
          </h2>
          {conflict ? (
            <p
              role="alert"
              className="rounded-lg border-2 border-bounty-red/40 bg-bounty-red/10 p-3 text-sm font-medium text-bounty-red"
            >
              {conflict}
            </p>
          ) : null}
          <SlotPicker onChange={onSlotChange} />
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 rounded-xl border border-ink/15 bg-parchment/95 p-3 shadow-lg backdrop-blur md:static md:bottom-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            {selection ? (
              <div className="mb-3 md:hidden">
                <BookingSummary
                  court={courts.data?.find((c) => c.id === selection.courtId)}
                  startAt={selection.startAt}
                  endAt={selection.endAt}
                />
              </div>
            ) : null}
            <Button
              type="button"
              disabled={!selection}
              onClick={() => setStep('details')}
              className="tap w-full bg-treasure-gold text-base font-semibold text-sea-deep hover:bg-treasure-gold/90 md:w-auto md:px-8"
            >
              {selection ? 'Continue' : 'Pick a time and court'}
            </Button>
          </div>
        </section>
      ) : selection ? (
        <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[1fr_20rem] md:items-start">
          <div className="space-y-5">
            {type === 'charter' ? (
              <Card className="bg-white/70">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl text-sea-deep">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {session?.user ? (
                    <dl className="grid gap-1">
                      <div>
                        <dt className="inline text-ink/60">Name: </dt>
                        <dd className="inline font-medium">{session.user.name}</dd>
                      </div>
                      <div>
                        <dt className="inline text-ink/60">Email: </dt>
                        <dd className="inline font-medium break-all">{session.user.email}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p>
                      You&apos;ll sign in to confirm this booking — we&apos;ll keep your selection.
                    </p>
                  )}
                  <p className="flex items-start gap-2 rounded-lg bg-treasure-gold/15 p-3">
                    <Wallet className="mt-0.5 size-4 shrink-0 text-sea-deep" aria-hidden />
                    Payment at the venue for now.
                  </p>
                  <p className="text-ink/65">Private Charters are never listed publicly.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/70">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl text-sea-deep">
                    Voyage details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReclubUrlField value={reclubUrl} onChange={setReclubUrl} />
                  <VoyageTitleField value={title} onChange={setTitle} />
                  <VisibilityToggle checked={isPublic} onCheckedChange={setIsPublic} />
                  {isPublic && !reclub.url ? (
                    <p className="text-sm text-ink/70">
                      Without a Reclub link this voyage is saved as private. Add the link later from
                      My Bookings, then switch on public listing.
                    </p>
                  ) : null}
                  {!session?.user ? (
                    <p className="text-sm text-ink/70">
                      You&apos;ll sign in to confirm — we&apos;ll keep your details.
                    </p>
                  ) : null}
                  <p className="flex items-start gap-2 rounded-lg bg-treasure-gold/15 p-3 text-sm">
                    <Wallet className="mt-0.5 size-4 shrink-0 text-sea-deep" aria-hidden />
                    Payment at the venue for now.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="wanted-poster space-y-4 p-4">
            <h2 className="font-heading text-2xl text-sea-deep">Your claim</h2>
            <BookingSummary court={court} startAt={selection.startAt} endAt={selection.endAt} />
            {submitError ? (
              <p role="alert" className="rounded-lg bg-bounty-red/10 p-3 text-sm text-bounty-red">
                {submitError}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={create.isPending || (type === 'voyage' && Boolean(reclub.error))}
              className="tap w-full bg-treasure-gold text-base font-semibold text-sea-deep hover:bg-treasure-gold/90"
            >
              {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Claim this court
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="tap w-full"
              onClick={() => {
                setSubmitError(null)
                setSelection(null)
                setStep('slot')
              }}
            >
              <ArrowLeft aria-hidden />
              Change court or time
            </Button>
          </aside>
        </form>
      ) : null}
    </div>
  )
}
