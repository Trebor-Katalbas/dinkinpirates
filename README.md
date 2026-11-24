# Dinkin' Pirates

Pickleball court booking with a Grand Line theme. **One court, two ways to play:**
**Private Charter** (never public, no Reclub) or **Open Voyage** (court booking + an optional
Reclub open-play link, broadcast to the Dock, Facebook and Messenger).

See [CLAUDE.md](CLAUDE.md) for the full product spec and guardrails.

## Stack

| Concern                      | Tool                                                  |
| ---------------------------- | ----------------------------------------------------- |
| Framework, dev server, build | Next.js 16 (App Router, Cache Components)             |
| Check / lint / format / test | Vite+ (`vp check`, `vp test`) — Oxlint, Oxfmt, Vitest |
| Styling / UI                 | Tailwind CSS v4, shadcn/ui (Grand Line palette)       |
| Data                         | MongoDB via Mongoose                                  |
| Client data fetching         | TanStack Query                                        |
| Charts                       | shadcn Chart (Recharts)                               |
| Auth                         | NextAuth v5 (Auth.js)                                 |
| 3D (Dock landing page only)  | three.js r186 + React Three Fiber                     |

## Getting started

```bash
vp install
cp .env.example .env.local        # then set AUTH_SECRET (npx auth secret) and OWNER_EMAILS
docker compose up -d mongo        # or point MONGODB_URI at any MongoDB
vp run seed                       # seed courts, users, sample bookings and clicks
vp run dev                        # next dev → http://localhost:3000
```

In development, sign in at `/signin` with any email (dev credentials provider). Emails listed
in `OWNER_EMAILS` get the `owner` role and can open the Captain's Log at `/admin`.

### Mock mode (no MongoDB)

Set `NEXT_PUBLIC_API_MOCKING=enabled` in `.env.local` and run `vp run dev`. A Mock Service
Worker (`src/mocks/`) then answers every `/api/*` request in the browser from seeded mock data
(courts, ~6 months of bookings, voyages, clicks) kept in `localStorage`:

- Sign in at `/signin` with any email; mock users get the `owner` role so every page is reachable.
- Bookings, cancels, Reclub links and visibility changes persist across reloads. The
  **Mock data · Reset** badge (bottom right) reseeds everything.
- The mock handlers reuse the real validation, slot and Reclub rules, so errors match the API.
- `/go/{id}` hands off to `/mock/go/{id}`, which logs the click and shows the Reclub URL the real
  route would redirect to (mock links are placeholders).
- Facebook posting answers 501, as the real API does when Facebook isn't configured.

Unset the variable (or leave it empty) to use the real API and MongoDB; MSW is then never loaded.

## Scripts

| Command        | What it does                     |
| -------------- | -------------------------------- |
| `vp run dev`   | `next dev`                       |
| `vp run build` | `next build`                     |
| `vp check`     | format + lint + type check       |
| `vp test`      | Vitest suite                     |
| `vp run seed`  | seed MongoDB (`scripts/seed.ts`) |

> `vp dev` / `vp build` are Vite+ built-ins and are **not** used for this Next.js app — use
> `vp run dev` / `vp run build`.

## Notes and deviations from the spec

- **`/go/[id]` runs on the Node runtime**, not Edge: `runtime = 'edge'` is deprecated in
  Next.js 16 and Mongoose needs Node. Clicks are logged in-process instead of via a
  self-`fetch`.
- The three.js scene is procedural (no model or texture downloads), is loaded client-side only
  on the Dock, and stops animating when the user prefers reduced motion.
