import Link from 'next/link'
import { WantedPoster } from '@/components/booking/wanted-poster'
import { DockHeroCanvas } from '@/components/dock/dock-hero-canvas'
import { CourtSchedule } from '@/components/dock/court-schedule'
import { ShipWheel } from '@/components/dock/ship-wheel'
import { SceneSlot } from '@/components/dock/views/scene-slot'
import type { SceneName } from '@/components/dock/views/scenes'
import { BrandMark } from '@/components/site/brand-logo'
import { DockVoyages } from '@/components/dock/dock-voyages'

const steps: { scene: SceneName; title: string; body: string }[] = [
  {
    scene: 'paddle',
    title: 'Claim a court',
    body: 'Pick a date, a time, and a court. Your booking is verified the moment it is confirmed.',
  },
  {
    scene: 'chain',
    title: 'Attach a Reclub link',
    body: 'Hosting open play? Paste your Reclub link. Roster and slots stay on Reclub.',
  },
  {
    scene: 'cannon',
    title: 'Broadcast it',
    body: 'Public voyages appear here on the Dock, on our Facebook page, and via Messenger.',
  },
]

export default function DockPage() {
  return (
    <>
      <section
        aria-labelledby="dock-title"
        className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#efdcb6_0%,#e3cfa9_45%,#d8c4a2_70%,#d8c4a2_100%)]"
      >
        {/* Anime speed lines radiating from the scene (desktop only, see globals.css). */}
        <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden>
          <div className="speed-lines md:left-[5%]" />
        </div>
        <ShipWheel className="spin-slow pointer-events-none absolute -top-16 -right-16 -z-10 size-44 opacity-60 md:top-auto md:right-auto md:-bottom-28 md:-left-28 md:size-80 md:opacity-40" />
        <div className="absolute inset-0 -z-10">
          <DockHeroCanvas />
        </div>
        <span
          aria-hidden
          className="burst pop-in pointer-events-none absolute top-[24%] right-[34%] hidden size-28 items-center justify-center bg-bounty-red font-display text-2xl text-paper -rotate-12 lg:flex"
        >
          DINK!
        </span>
        <div className="hero-exit pointer-events-none mx-auto flex min-h-[78svh] max-w-6xl flex-col px-4 pt-6 pb-72 md:min-h-[86svh] md:pt-12 md:pb-40">
          <div className="flex items-center gap-3 self-start">
            <span className="flex size-20 items-center justify-center rounded-full bg-paper/90 shadow-[0_4px_0_rgb(43_30_26/0.35)] ring-4 ring-umber md:size-24">
              <BrandMark size={96} priority className="size-16 md:size-20" />
            </span>
            <p className="font-display text-lg leading-tight tracking-wide text-umber uppercase">
              Dinkin&apos; Pirates
              <span className="block text-xs font-sans font-bold tracking-[0.25em] text-maroon">
                The Pickleball Club
              </span>
            </p>
          </div>
          <h1
            id="dock-title"
            className="manga-title mt-5 max-w-2xl text-5xl sm:text-7xl md:text-8xl"
          >
            One court,
            <br />
            two ways to play.
          </h1>
          <p className="mt-5 max-w-xl rounded-md bg-paper/85 px-3 py-2 text-base font-medium text-ink/90 shadow-[3px_3px_0_rgb(43_30_26/0.25)] sm:text-lg">
            Book a <strong>Private Charter</strong> for your crew, or launch an{' '}
            <strong>Open Voyage</strong>: attach your Reclub open-play link and we&apos;ll broadcast
            it to the Dock, Facebook, and Messenger.
          </p>
          <div className="pointer-events-auto mt-6 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="tap inline-flex items-center rounded-md border-2 border-umber bg-treasure-gold px-6 font-display text-xl tracking-wide text-umber uppercase shadow-[4px_4px_0_var(--color-umber)] transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-umber/40 focus-visible:outline-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-umber)]"
            >
              Claim a Court
            </Link>
            <Link
              href="/voyages"
              className="tap inline-flex items-center rounded-md border-2 border-umber bg-paper px-6 font-display text-xl tracking-wide text-umber uppercase shadow-[4px_4px_0_var(--color-umber)] transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-umber/40 focus-visible:outline-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-umber)]"
            >
              Open Voyages
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Choose how to play" className="relative mx-auto -mt-28 max-w-5xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          <WantedPoster
            title="Private Charter"
            subtitle="Just you and your crew. Never listed publicly."
            bounty="No Reclub needed"
            href="/book?type=charter"
            className="reveal-tilt-l"
          >
            <ul className="list-inside list-disc space-y-1">
              <li>Pick a court, date and time</li>
              <li>Verified court booking</li>
              <li>Reschedule or cancel anytime</li>
            </ul>
          </WantedPoster>
          <WantedPoster
            title="Open Voyage"
            subtitle="Court booking plus an optional Reclub open-play link."
            bounty="Shareable on the Dock"
            href="/book?type=voyage"
            className="reveal-tilt-r"
          >
            <ul className="list-inside list-disc space-y-1">
              <li>Attach your Reclub link</li>
              <li>Publish to the Dock &amp; Facebook</li>
              <li>Roster and slots are managed on Reclub</li>
            </ul>
          </WantedPoster>
        </div>
      </section>

      <section aria-labelledby="schedule-title" className="reveal mt-14 px-4">
        <CourtSchedule />
      </section>

      <div className="wave-divider mt-14" aria-hidden />

      <section aria-labelledby="how-title" className="mx-auto max-w-5xl px-4 py-12">
        <h2 id="how-title" className="reveal-left manga-title text-4xl sm:text-5xl">
          How the voyage works
        </h2>
        <ol className="reveal-stagger mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="paper rounded-md p-5">
              <div className="flex items-center gap-3">
                <SceneSlot
                  name={s.scene}
                  className="size-24 shrink-0 rounded-full bg-paper ring-4 ring-umber shadow-[3px_3px_0_var(--color-coin)]"
                />
                <span className="manga-title text-4xl">0{i + 1}</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="voyages-title" className="mx-auto max-w-5xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <div className="reveal-left flex items-center gap-2">
            <SceneSlot name="bottle" className="size-16 shrink-0 sm:size-20" />
            <h2 id="voyages-title" className="manga-title text-4xl sm:text-5xl">
              Upcoming Open Voyages
            </h2>
          </div>
          <Link
            href="/voyages"
            className="tap inline-flex items-center text-sm font-semibold text-sea-teal underline-offset-4 hover:underline"
          >
            See all
          </Link>
        </div>
        <DockVoyages />
        <p className="mt-4 text-xs text-ink/60">
          Open play links are shared by organizers. Roster, slots, and availability are managed on
          Reclub.
        </p>
      </section>
    </>
  )
}
