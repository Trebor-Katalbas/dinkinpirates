'use client'

import { useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, Home, Sun } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { availabilityQuery, slotsQuery, useCourts } from '@/components/booking/queries'
import {
  CALENDAR_DAYS,
  HOUR_OPTIONS,
  STRIP_DAYS,
  addDaysKey,
  courtMeta,
  formatDateKey,
  formatMoney,
  keyToLocalDate,
  localDateToKey,
  nextDayKeys,
  runEnd,
  sortSlots,
  venueHHmm,
  type SlotSelection,
} from '@/components/booking/slot-utils'
import { useNow } from '@/components/site/use-now'
import { DAY_STATUS_LABEL, freeRunFrom } from '@/lib/availability'
import { formatVenueTime, venueDateKey } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { CourtDTO, DayStatus, SlotDTO } from '@/types'

export interface SlotPickerProps {
  /** Called with a complete selection, or null when the selection becomes incomplete. */
  onChange: (selection: SlotSelection | null) => void
  /** Lock to a single court (used for rescheduling — the API keeps the court). */
  fixedCourtId?: string
  initialHours?: number
  className?: string
}

interface TimeOption {
  startTime: string
  startAt: string
  /** courtId → run end ISO, for courts where the full duration is free */
  courts: Map<string, string>
  /** Longest free run (hours) on any court from this start — explains "too short" times. */
  maxRun: number
  past: boolean
}

type Tone = 'free' | 'partial' | 'off'

/** Short reason shown under each start time. */
function timeStatus(opt: TimeOption, hours: number): { label: string; tone: Tone } {
  if (opt.past) return { label: 'Passed', tone: 'off' }
  const n = opt.courts.size
  if (n > 0) return { label: n === 1 ? '1 court left' : `${n} courts free`, tone: 'free' }
  if (opt.maxRun > 0 && opt.maxRun < hours) {
    return { label: `Only ${opt.maxRun}h free`, tone: 'partial' }
  }
  return { label: 'Booked', tone: 'off' }
}

const DAY_BAR: Record<DayStatus, string> = {
  open: 'bg-emerald-600',
  limited: 'bg-treasure-gold',
  full: 'bg-bounty-red',
  closed: 'bg-ink/30',
}

function AvailabilityLegend({ className }: { className?: string }) {
  const items: DayStatus[] = ['open', 'limited', 'full', 'closed']
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/75', className)}>
      {items.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <span className={cn('h-1.5 w-4 rounded-full', DAY_BAR[s])} aria-hidden />
          {DAY_STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  )
}

function buildTimeOptions(
  courts: CourtDTO[],
  slotsByCourt: Map<string, SlotDTO[]>,
  hours: number,
  now: number,
): TimeOption[] {
  const byTime = new Map<string, TimeOption>()
  for (const court of courts) {
    const slots = slotsByCourt.get(court.id)
    if (!slots) continue
    slots.forEach((slot, i) => {
      const startTime = venueHHmm(slot.startAt)
      let opt = byTime.get(startTime)
      if (!opt) {
        opt = {
          startTime,
          startAt: slot.startAt,
          courts: new Map(),
          maxRun: 0,
          past: Date.parse(slot.startAt) <= now,
        }
        byTime.set(startTime, opt)
      }
      const end = runEnd(slots, i, hours)
      if (end) opt.courts.set(court.id, end)
      opt.maxRun = Math.max(opt.maxRun, freeRunFrom(slots, i))
    })
  }
  return [...byTime.values()].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
}

export function SlotPicker({
  onChange,
  fixedCourtId,
  initialHours = 1,
  className,
}: SlotPickerProps) {
  const now = useNow()
  const courtsQ = useCourts()
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [hours, setHours] = useState(initialHours)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [courtId, setCourtId] = useState<string | null>(fixedCourtId ?? null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const today = now === null ? null : venueDateKey(new Date(now))
  const avail = useQuery({
    ...availabilityQuery(today ?? '', CALENDAR_DAYS, hours),
    enabled: today !== null && !fixedCourtId,
  })
  const statusByDate = new Map((avail.data ?? []).map((d) => [d.date, d.status]))
  const dayStatus = (key: string): DayStatus | undefined => statusByDate.get(key)
  const blockedDates = (avail.data ?? []).filter(
    (d) => d.status === 'full' || d.status === 'closed',
  )
  // Start on the first day that still has openings (e.g. tomorrow, once today has closed).
  const firstBookable = avail.data?.find((d) => d.status === 'open' || d.status === 'limited')?.date
  const date = pickedDate ?? firstBookable ?? today

  const courts = (courtsQ.data ?? []).filter(
    (c) => c.active && (!fixedCourtId || c.id === fixedCourtId),
  )

  const slotResults = useQueries({
    queries: courts.map((c) => ({
      ...slotsQuery(c.id, date ?? ''),
      enabled: date !== null,
    })),
  })

  const slotsByCourt = new Map<string, SlotDTO[]>()
  courts.forEach((c, i) => {
    const data = slotResults[i]?.data
    if (data) slotsByCourt.set(c.id, sortSlots(data))
  })
  const slotsLoading = slotResults.some((r) => r.isPending)
  const slotsError = slotResults.find((r) => r.isError)?.error

  const timeOptions = buildTimeOptions(courts, slotsByCourt, hours, now ?? 0)
  const selectedTime = timeOptions.find((t) => t.startTime === startTime) ?? null
  const activeCourtId = fixedCourtId ?? courtId
  // The chosen court/time was claimed by someone else since the times last refreshed.
  const lost = Boolean(
    selectedTime && activeCourtId && !slotsLoading && !selectedTime.courts.has(activeCourtId),
  )
  const lostCourt = lost ? courts.find((c) => c.id === activeCourtId) : undefined

  useEffect(() => {
    if (lost) onChange(null)
  }, [lost, onChange])

  function reset(nextHours = hours) {
    setStartTime(null)
    if (!fixedCourtId) setCourtId(null)
    setHours(nextHours)
    onChange(null)
  }

  function emit(time: TimeOption, cId: string) {
    const endAt = time.courts.get(cId)
    if (!endAt || !date) return onChange(null)
    onChange({ courtId: cId, date, startTime: time.startTime, hours, startAt: time.startAt, endAt })
  }

  function chooseDate(key: string) {
    setPickedDate(key)
    reset()
  }

  function chooseTime(opt: TimeOption) {
    setStartTime(opt.startTime)
    if (fixedCourtId) {
      emit(opt, fixedCourtId)
      return
    }
    // Keep the chosen court if it is still free at the new time.
    if (courtId && opt.courts.has(courtId)) emit(opt, courtId)
    else {
      setCourtId(null)
      onChange(null)
    }
  }

  function chooseCourt(id: string) {
    setCourtId(id)
    if (selectedTime) emit(selectedTime, id)
  }

  /** Jump straight to a court's next free time (from a booked court card). */
  function jumpTo(opt: TimeOption, id: string) {
    setStartTime(opt.startTime)
    setCourtId(id)
    emit(opt, id)
  }

  /** A time that's free, just not for the chosen length: shorten the session to fit. */
  function shortenTo(opt: TimeOption) {
    setHours(opt.maxRun)
    setStartTime(opt.startTime)
    if (!fixedCourtId) setCourtId(null)
    onChange(null)
  }

  if (today === null || date === null || courtsQ.isPending) {
    return (
      <div className={cn('space-y-4', className)} aria-busy="true">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (courtsQ.isError) {
    return (
      <p role="alert" className="rounded-lg bg-bounty-red/10 p-4 text-bounty-red">
        Could not load courts: {courtsQ.error.message}
      </p>
    )
  }

  if (courts.length === 0) {
    return <p className="rounded-lg bg-white/60 p-4">No courts are open for booking right now.</p>
  }

  const stripDays = nextDayKeys(STRIP_DAYS, today)
  const lastBookable = addDaysKey(today, CALENDAR_DAYS - 1)

  return (
    <div className={cn('grid gap-6 md:grid-cols-[auto_1fr] md:items-start', className)}>
      {/* ---- Date: mobile strip ---- */}
      <fieldset className="min-w-0 md:hidden">
        <legend className="sr-only">Pick a day</legend>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-sea-deep" aria-hidden>
            Pick a day
          </span>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="tap inline-flex items-center gap-1.5 rounded-lg border-2 border-sea-deep bg-paper px-3 text-sm font-semibold text-sea-deep outline-none focus-visible:ring-3 focus-visible:ring-treasure-gold"
          >
            <CalendarDays className="size-4" aria-hidden />
            Calendar
          </button>
        </div>
        {stripDays.includes(date) ? null : (
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="tap mb-2 inline-flex items-center gap-2 rounded-xl border-2 border-sea-deep bg-sea-deep px-3 text-sm font-semibold text-parchment"
          >
            <CalendarDays className="size-4" aria-hidden />
            Selected: {formatDateKey(date, { weekday: 'short', month: 'short', day: 'numeric' })}
          </button>
        )}
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
          {stripDays.map((key) => {
            const selected = key === date
            const status = dayStatus(key)
            const blocked = status === 'full' || status === 'closed'
            const day = formatDateKey(key, { weekday: 'long', month: 'long', day: 'numeric' })
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                disabled={blocked && !selected}
                aria-label={status ? `${day}, ${DAY_STATUS_LABEL[status]}` : day}
                onClick={() => chooseDate(key)}
                className={cn(
                  'flex min-h-[4.5rem] w-14 shrink-0 snap-start flex-col items-center justify-center rounded-xl border-2 text-sm transition-colors outline-none',
                  'focus-visible:ring-3 focus-visible:ring-treasure-gold',
                  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-ink/5 disabled:text-ink/40',
                  selected
                    ? 'border-sea-deep bg-sea-deep text-parchment'
                    : 'border-ink/20 bg-white/70 text-ink hover:border-sea-teal',
                )}
              >
                <span className="text-xs uppercase" aria-hidden>
                  {key === today ? 'Today' : formatDateKey(key, { weekday: 'short' })}
                </span>
                <span
                  className={cn('text-xl font-semibold', blocked && 'line-through')}
                  aria-hidden
                >
                  {formatDateKey(key, { day: 'numeric' })}
                </span>
                <span
                  className={cn(
                    'mt-1 h-1.5 w-6 rounded-full',
                    status ? DAY_BAR[status] : 'bg-ink/10',
                  )}
                  aria-hidden
                />
              </button>
            )
          })}
        </div>
        {fixedCourtId ? null : <AvailabilityLegend className="mt-1" />}
      </fieldset>

      {/* ---- Date: full calendar on phones (any day in the booking window) ---- */}
      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="w-auto max-w-[calc(100vw-2rem)] bg-paper p-4 md:hidden">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide text-umber uppercase">
              Pick a day
            </DialogTitle>
            <DialogDescription>
              Courts can be claimed up to {CALENDAR_DAYS} days ahead.
            </DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            required
            selected={keyToLocalDate(date)}
            onSelect={(d) => {
              chooseDate(localDateToKey(d))
              setCalendarOpen(false)
            }}
            disabled={[
              { before: keyToLocalDate(today) },
              { after: keyToLocalDate(lastBookable) },
              ...blockedDates.map((d) => keyToLocalDate(d.date)),
            ]}
            modifiers={{
              limited: (avail.data ?? [])
                .filter((d) => d.status === 'limited')
                .map((d) => keyToLocalDate(d.date)),
              full: blockedDates
                .filter((d) => d.status === 'full')
                .map((d) => keyToLocalDate(d.date)),
            }}
            modifiersClassNames={{ limited: 'dp-day-limited', full: 'dp-day-full' }}
            startMonth={keyToLocalDate(today)}
            endMonth={keyToLocalDate(lastBookable)}
            className="mx-auto rounded-xl border border-ink/15 bg-white/70 [--cell-size:--spacing(11)]"
          />
        </DialogContent>
      </Dialog>

      {/* ---- Date: desktop calendar ---- */}
      <div className="hidden md:block">
        <p className="mb-2 text-sm font-semibold text-sea-deep">Pick a day</p>
        <Calendar
          mode="single"
          required
          selected={keyToLocalDate(date)}
          onSelect={(d) => chooseDate(localDateToKey(d))}
          disabled={[
            { before: keyToLocalDate(today) },
            { after: keyToLocalDate(lastBookable) },
            ...blockedDates.map((d) => keyToLocalDate(d.date)),
          ]}
          modifiers={{
            limited: (avail.data ?? [])
              .filter((d) => d.status === 'limited')
              .map((d) => keyToLocalDate(d.date)),
            full: blockedDates
              .filter((d) => d.status === 'full')
              .map((d) => keyToLocalDate(d.date)),
          }}
          modifiersClassNames={{ limited: 'dp-day-limited', full: 'dp-day-full' }}
          startMonth={keyToLocalDate(today)}
          endMonth={keyToLocalDate(lastBookable)}
          className="rounded-xl border border-ink/15 bg-white/70 [--cell-size:--spacing(10)]"
        />
        <AvailabilityLegend className="mt-2" />
      </div>

      <div className="min-w-0 space-y-6">
        {lost && selectedTime ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border-2 border-bounty-red/40 bg-bounty-red/10 p-3 text-sm text-bounty-red"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {lostCourt?.name ?? 'That court'} at {formatVenueTime(selectedTime.startAt)} was just
              claimed by another crew. Pick another time or court.
            </span>
          </p>
        ) : null}
        {/* ---- Duration ---- */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-sea-deep">How long?</legend>
          <div className="grid grid-cols-4 gap-2 sm:max-w-sm">
            {HOUR_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={hours === h}
                onClick={() => reset(h)}
                className={cn(
                  'tap rounded-lg border-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-treasure-gold',
                  hours === h
                    ? 'border-sea-deep bg-sea-deep text-parchment'
                    : 'border-ink/20 bg-white/70 hover:border-sea-teal',
                )}
              >
                {h}h
              </button>
            ))}
          </div>
        </fieldset>

        {/* ---- Time ---- */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-sea-deep">
            Start time · {formatDateKey(date, { weekday: 'long', month: 'short', day: 'numeric' })}
          </legend>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="h-11 rounded-lg" />
              ))}
            </div>
          ) : slotsError ? (
            <p role="alert" className="text-bounty-red">
              Could not load times: {slotsError.message}
            </p>
          ) : timeOptions.every((t) => t.courts.size === 0) ? (
            <p className="rounded-lg bg-white/60 p-4 text-sm">
              No {hours}-hour openings on this day. Try a shorter session or another day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {timeOptions.map((opt) => {
                const st = timeStatus(opt, hours)
                const canShorten = st.tone === 'partial' && !fixedCourtId
                const selected = opt.startTime === startTime && st.tone === 'free'
                const time = formatVenueTime(opt.startAt)
                const runLabel = `${opt.maxRun} hour${opt.maxRun > 1 ? 's' : ''}`
                return (
                  <button
                    key={opt.startTime}
                    type="button"
                    disabled={st.tone === 'off' || (st.tone === 'partial' && !canShorten)}
                    aria-pressed={selected}
                    aria-label={
                      canShorten
                        ? `${time}: only ${runLabel} free. Switch to ${opt.maxRun}h`
                        : `${time}: ${st.label}`
                    }
                    title={canShorten ? `Tap to switch to a ${opt.maxRun}h session` : undefined}
                    onClick={() => (st.tone === 'partial' ? shortenTo(opt) : chooseTime(opt))}
                    className={cn(
                      'flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-1 py-1 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-treasure-gold',
                      'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-ink/5 disabled:text-ink/40',
                      selected
                        ? 'border-treasure-gold bg-treasure-gold text-sea-deep'
                        : st.tone === 'partial'
                          ? 'border-dashed border-treasure-gold/70 bg-treasure-gold/10 hover:border-treasure-gold'
                          : 'border-ink/20 bg-white/70 hover:border-sea-teal',
                    )}
                  >
                    <span className={cn(st.tone === 'off' && 'line-through')}>{time}</span>
                    <span
                      className={cn(
                        'text-[10px] leading-tight font-medium',
                        selected
                          ? 'text-sea-deep/80'
                          : st.tone === 'free'
                            ? 'text-emerald-700'
                            : st.tone === 'partial'
                              ? 'text-ink/70'
                              : 'text-bounty-red/80',
                      )}
                      aria-hidden
                    >
                      {st.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </fieldset>

        {/* ---- Court ---- */}
        {!fixedCourtId && selectedTime ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-sea-deep">Choose your court</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {courts.map((court) => {
                const free = selectedTime.courts.has(court.id)
                const selected = court.id === courtId && free
                const at = formatVenueTime(selectedTime.startAt)
                // For a booked court: its next opening of the same length later that day.
                const next = free
                  ? undefined
                  : timeOptions.find(
                      (t) =>
                        Date.parse(t.startAt) > Date.parse(selectedTime.startAt) &&
                        t.courts.has(court.id),
                    )
                const bookedLabel = next
                  ? `${court.name} is booked at ${at}. Switch to its next free time, ${formatVenueTime(next.startAt)}`
                  : `${court.name} has no ${hours}-hour openings left this day`
                return (
                  <button
                    key={court.id}
                    type="button"
                    disabled={!free && !next}
                    aria-pressed={selected}
                    aria-label={free ? undefined : bookedLabel}
                    onClick={() => {
                      if (free) chooseCourt(court.id)
                      else if (next) jumpTo(next, court.id)
                    }}
                    className={cn(
                      'relative flex min-h-20 items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-treasure-gold',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      !free && next && 'border-dashed bg-white/40',
                      selected
                        ? 'border-sea-deep bg-sea-deep/5 shadow-[0_3px_0_var(--color-sea-deep)]'
                        : 'border-ink/20 bg-white/70 hover:border-sea-teal',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                        court.indoor
                          ? 'bg-sea-teal/15 text-sea-teal'
                          : 'bg-treasure-gold/20 text-ink',
                      )}
                      aria-hidden
                    >
                      {court.indoor ? <Home className="size-5" /> : <Sun className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-sea-deep">{court.name}</span>
                      <span className="block text-xs text-ink/70">{courtMeta(court)}</span>
                      <span className="mt-1 block text-sm">
                        {formatMoney(court.pricePerHour * hours, court.currency)}
                        <span className="text-ink/60"> for {hours}h</span>
                      </span>
                      {!free ? (
                        <span className="mt-1 block text-xs">
                          <span className="font-semibold text-bounty-red">Booked at {at}</span>
                          <span className="block text-ink/70">
                            {next
                              ? `Tap for its next opening: ${formatVenueTime(next.startAt)}`
                              : `No ${hours}h openings left this day`}
                          </span>
                        </span>
                      ) : null}
                    </span>
                    {selected ? <Check className="size-5 text-sea-deep" aria-hidden /> : null}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ) : null}
      </div>
    </div>
  )
}
