# CLAUDE.md — Dinkin' Pirates

Project context and working instructions for Claude when contributing to **Dinkin' Pirates**, a pickleball court booking platform built with **Vite+ as the toolchain for Next.js**.

---

## 1. Project Overview

**Dinkin' Pirates** is a pickleball court reservation platform with a One Piece-inspired "Grand Line" visual theme.

> **One court, two ways to play: Private Charter or Open Voyage.**

- **Private Charter** — standard court reservation. No Reclub required. Never publicly listed.
- **Open Voyage** — court reservation + an optional Reclub open-play link. Publicly discoverable and shareable via the landing page, Messenger, and Facebook page.

The platform is the **court booking + verification + distribution layer**. Reclub is the external roster. We never scrape Reclub, never display slot counts, and never claim to know real-time availability. The redirect is the only Reclub interaction.

### Positioning

> "Dinkin' Pirates is the court booking system that turns every reservation into a Reclub-powered open play — book the court, attach the link, and broadcast it to Facebook and Messenger."

---

## 2. Tech Stack — Vite+ as Next.js Toolchain

This project uses **Vite+** as the unified toolchain, with **Next.js serving as the application framework and build system**.

### What Vite+ handles

Vite+ provides **check, lint, format, and test** for Next.js projects, but **does not run the dev server or production build** — Next.js owns those [citation:2].

| Task | Command | Tool |
|---|---|---|
| Dev server | `next dev` | Next.js |
| Production build | `next build` | Next.js |
| Format + lint + type check | `vp check` | Oxlint, Oxfmt, TypeScript Go |
| Test | `vp test` | Vitest |
| Package management | `vp install` / `vp add` | Vite+ |

### Full stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** MongoDB (`mongodb` or `mongoose`)
- **UI Components:** shadcn/ui (themed with Grand Line palette)
- **Data Fetching:** TanStack Query (`@tanstack/react-query`)
- **Charts:** shadcn Chart (Recharts)
- **Auth:** NextAuth
- **Toolchain:** Vite+ (`vp` CLI) — check, lint, format, test
- **Payments (later):** Stripe Checkout

---

## 3. Vite+ Setup for Next.js

### 3.1 Scaffold the Next.js project

Use `vp create` with the full `create-next-app` package name [citation:3]:

```bash
vp create create-next-app -- --typescript --tailwind --app --src-dir --import-alias "@/*"
If vp create cannot wrap Next.js cleanly, fall back to npx create-next-app@latest directly and then install Vite+ as a dev dependency.

3.2 Install Vite+ as project-local CLI
bash
# npm
npm install -D vite-plus

# pnpm
pnpm add -D vite-plus
Add package manager overrides so Vite+ tools resolve correctly :

json
// package.json
{
  "overrides": {
    "vite@*": "npm:@voidzero-dev/vite-plus-core@<core-version>",
    "vitest@*": "<vitest-version>"
  }
}
Get the exact versions:

bash
./node_modules/.bin/vp toolchain vite-plus-core
./node_modules/.bin/vp toolchain vitest

3.3 Configure vite.config.ts

Create a root vite.config.ts for Vite+ check/lint/format/test settings. Next.js continues to use next.config.ts for its own build configuration .

ts
// vite.config.ts
import { defineConfig, lazyPlugins } from 'vite-plus'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  lint: {
    plugins: ['oxc', 'typescript', 'unicorn', 'react'],
    categories: { correctness: 'error' },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      // project-specific rules
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    printWidth: 100,
  },
})
3.4 Scripts
json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "check": "vp check",
    "test": "vp test",
    "test:watch": "vp test --watch"
  }
}
3.5 Command reference
Command	What it does
vp check	Format + lint + type check in one pass
vp test	Run Vitest suite
vp install	Install dependencies
vp add <pkg>	Add a dependency
next dev	Start Next.js dev server
next build	Production build
Important distinction:

vp dev and vp test run Vite+ built-in tools (not used for Next.js dev server)

vp run dev runs the dev script from package.json (which is next dev)

4. MongoDB Data Model
js
// users
{
  _id, name, email, avatar, role: "player" | "organizer" | "owner",
  points: Number,        // bounty
  tier: "deckhand" | "buccaneer" | "firstMate" | "captain" | "legend",
  createdAt
}

// courts
{
  _id, name, surface, indoor: Boolean,
  pricePerHour, currency,
  openHours: { start, end },
  photoUrls: [String],
  active: Boolean
}

// bookings
{
  _id,
  courtId, userId,
  type: "charter" | "voyage",
  startAt, endAt,
  status: "pending" | "confirmed" | "cancelled" | "completed",
  paymentIntentId: String | null,
  reclubUrl: String | null,
  voyageVisibility: "private" | "public" | null,
  voyageTitle: String | null,
  externalId: String | null,
  createdAt, cancelledAt
}

// voyage_clicks
{
  _id, bookingId,
  source: "landing" | "messenger" | "fb" | "qr",
  userAgent, ipHash,
  createdAt
}

// fb_events
{
  _id, bookingId, commentId, psid,
  action: "sent" | "failed",
  createdAt
}
Indexes:

bookings: { courtId: 1, startAt: 1 }, { status: 1, startAt: 1 }, { type: 1, voyageVisibility: 1, startAt: 1 }

voyage_clicks: { bookingId: 1, createdAt: -1 }

users: unique { email: 1 }

Rule: Never store Reclub-derived data. reclubUrl is a plain string; externalId is only for dedupe.

5. Booking Flow
Entry (Dock)
Two Wanted-poster cards: Private Charter → date/time picker; Open Voyage → public voyage feed.

Court & Time
Mobile: date strip → time chips → court card. Desktop: shadcn Calendar + time grid. Disable past/unavailable slots.

Details
Charter: contact + payment only.

Voyage: optional reclubUrl (validate https:// + reclub.co domain), voyageTitle, voyageVisibility toggle.

"Publishing this link shares it on the Dock and our Facebook page. Roster and slots are managed on Reclub."

Confirmation (Letter of Marque)
If voyage + public → Share to Facebook + copy /go/{id} link buttons. Trigger Messenger DM.

Manage (/bookings/[id])
Reschedule, cancel, add/remove Reclub link, toggle visibility. Cancel cascades: hide public voyage + stop comment-to-DM.

6. Reclub Integration Rules
Dinkin' Pirates verifies the court booking and distributes the organizer's Reclub link. Reclub owns everything after the click.

Show only what you own
Court date/time, venue, organizer name

"Open play link shared by organizer"

Button: View on Reclub

"Roster, slots, and availability are managed on Reclub."

Never show
Spots left, player count, "spots available"

"Full" / "Almost full" (unless organizer manually removes link)

"Verified open play" — only "Verified court booking"

Copy rules
Use: "View on Reclub", "Get Reclub link", "Check Reclub for availability"

Avoid: "Join now", "Spots available"

FB comment keyword: "LINK" (not "JOIN")

Quality controls
Auto-expire: hide public link 1 hour after court booking ends

Cancel propagation: hide Reclub link immediately on booking cancellation

Dedupe: parse Reclub URL to prevent duplicate attachments

Private booking = no public link ever

7. /go/[id] Redirect Route
ts
// app/go/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const source = req.nextUrl.searchParams.get("src") ?? "landing";
  const booking = await db.bookings.findById(params.id, {
    reclubUrl: 1, status: 1, endAt: 1
  }).lean();

  if (!booking?.reclubUrl || booking.status === "cancelled" || new Date(booking.endAt) < new Date()) {
    return NextResponse.redirect(new URL("/voyages?expired=1", req.url));
  }

  fetch(new URL("/api/voyage-clicks", req.url), {
    method: "POST",
    body: JSON.stringify({ bookingId: params.id, source }),
  });

  return NextResponse.redirect(booking.reclubUrl, 302);
}
Append ?src=messenger|fb|qr to every generated link for attribution.

8. Facebook / Messenger Integration
Webhook: /api/webhooks/fb — verify + listen to feed (comment) events.

Comment keyword: ^LINK$ on a post tagged with bookingId.

Action: Look up public voyage → send Messenger DM with dinkinpirates.com/go/{id}?src=messenger → log to fb_events.

Post template:

⚓ Court booked {date} {time}. Organizer shared a Reclub open play link. Comment LINK and we'll DM it. Availability is managed on Reclub.

9. Design — Grand Line Theme
Palette (Tailwind tokens)
Token	Value	Usage
parchment	#F4E4C1	Backgrounds
sea-deep	#0B3D5C	Primary
sea-teal	#1F7A8C	Secondary
treasure-gold	#D4A017	Accents, CTAs
bounty-red	#A4243B	Alerts, badges
ink	#1A1A1A	Text
Naming map
Generic	Dinkin' Pirates
Home	Dock
Book court	Claim a Court
Private booking	Private Charter
Open play link	Open Voyage
Loyalty points	Bounty
Tiers	Deckhand → Buccaneer → First Mate → Captain → Dinkin' Legend
Analytics	Captain's Log
Confirmation	Letter of Marque
shadcn theme tokens
css
:root {
  --background: 38 55% 88%;
  --foreground: 0 0% 10%;
  --primary: 199 75% 20%;
  --primary-foreground: 38 55% 96%;
  --secondary: 42 80% 47%;
  --secondary-foreground: 199 75% 15%;
  --accent: 350 65% 42%;
  --accent-foreground: 38 55% 96%;
  --radius: 0.75rem;
}
Copyright guardrail
No copyrighted One Piece assets. No character names, no official Straw Hat Jolly Roger, no official artwork. Use only visual language: wanted-poster layouts, parchment textures, wave dividers, compass motifs.

Mobile checklist
Tap targets ≥ 44px

Date strip: overflow-x-auto snap-x snap-mandatory

Bottom nav: pb-[env(safe-area-inset-bottom)]

Gate parchment textures behind md: or prefers-reduced-data

Test /go redirect — universal links handle Reclub app opening

10. Charts — Captain's Log (Admin)
Use shadcn Chart (Recharts) + TanStack Query.

Bookings per week — line chart, split by charter vs voyage

Occupancy heatmap — SVG grid, day-of-week × hour, highlight off-peak

Voyage click-through — bar chart by source (landing / messenger / fb / qr)

Tier distribution — donut

Revenue trend — area chart, 90 days

tsx
const { data, isLoading } = useQuery({
  queryKey: ["admin", "bookings-weekly", range],
  queryFn: () => fetch(`/api/admin/metrics?range=${range}`).then(r => r.json()),
  staleTime: 60_000,
});
11. Build Order
Sprint 1 — Core booking
Mongo schema + seed courts

Auth (NextAuth)

/book → court + time picker → confirmation → manage page

Themed Dock landing

Sprint 2 — Voyages
reclubUrl field + visibility toggle + URL validation

/voyages public feed

/go/[id] redirect + click logging

Admin metrics API + first chart

Sprint 3 — Distribution
FB Page publish + comment-to-DM webhook

Messenger reminder cron

Bounty points + tier badges

12. Constraints & Guardrails
Must do
Preserve unrelated changes if directory not empty

Do not overwrite existing project files

Do not scrape Reclub or display slot/player data

Do not add copyrighted One Piece assets

Do not commit or push unless asked

Use Next.js for dev server and build; use Vite+ for check/lint/format/test 

Must not do
Never force Reclub on a private booking

Never publicly expose a private booking

Never display Reclub slot counts or "spots available"

Never claim "verified open play" — only "verified court booking"

Never use "JOIN" as FB comment keyword — use "LINK"

Pitfalls
Desktop Reclub links: consider an interstitial "Opening Reclub…" page for desktop users

Parchment textures on mobile: gate behind md: or prefers-reduced-data

13. One-Line Positioning
"Dinkin' Pirates is the court booking system that turns every reservation into a Reclub-powered open play — book the court, attach the link, and broadcast it to Facebook and Messenger."