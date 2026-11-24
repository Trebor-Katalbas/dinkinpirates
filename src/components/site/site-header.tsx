'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Suspense } from 'react'
import { BarChart3, LogIn, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/site/brand-logo'
import { MAIN_NAV, isActive, type NavItem } from '@/components/site/nav-items'
import { useMe } from '@/components/site/use-me'
import { tierLabel } from '@/lib/tiers'
import { cn } from '@/lib/utils'

const ADMIN_NAV: NavItem = {
  href: '/admin',
  label: "Captain's Log",
  short: 'Log',
  icon: BarChart3,
}

function DesktopLinks({ pathname, isOwner }: { pathname: string | null; isOwner: boolean }) {
  const items = isOwner ? [...MAIN_NAV, ADMIN_NAV] : MAIN_NAV
  return (
    <ul className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'tap inline-flex items-center rounded-lg px-3 text-sm font-medium text-parchment/85 transition-colors outline-none',
                'hover:bg-white/10 hover:text-parchment focus-visible:ring-2 focus-visible:ring-treasure-gold',
                active && 'bg-white/10 text-treasure-gold',
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function ActiveDesktopLinks({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname()
  return <DesktopLinks pathname={pathname} isOwner={isOwner} />
}

function AccountArea() {
  const { data: session, status } = useSession()
  const me = useMe()

  if (status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" aria-hidden />
  }

  if (status !== 'authenticated') {
    return (
      <Button
        asChild
        className="tap bg-treasure-gold px-3 font-semibold text-sea-deep hover:bg-treasure-gold/90"
      >
        <Link href="/signin">
          <LogIn aria-hidden />
          <span>Sign in</span>
        </Link>
      </Button>
    )
  }

  const name = me.data?.name ?? session.user.name
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {me.data ? (
        <Badge
          className="h-7 border border-treasure-gold/60 bg-bounty-red px-2.5 text-parchment"
          title={`Bounty: ${me.data.points.toLocaleString()} points`}
        >
          <span className="sr-only">Bounty tier: </span>
          {tierLabel(me.data.tier)}
          <span className="hidden font-normal text-parchment/80 sm:inline">
            · {me.data.points.toLocaleString()} bounty
          </span>
        </Badge>
      ) : null}
      <span className="hidden max-w-32 truncate text-sm text-parchment/80 lg:inline">{name}</span>
      {session.user.role === 'owner' ? (
        <Button
          asChild
          variant="ghost"
          className="tap px-2 text-parchment hover:bg-white/10 hover:text-parchment md:hidden"
        >
          <Link href="/admin" aria-label="Captain's Log">
            <BarChart3 aria-hidden />
          </Link>
        </Button>
      ) : null}
      <Button
        variant="ghost"
        className="tap px-2 text-parchment hover:bg-white/10 hover:text-parchment"
        onClick={() => void signOut({ redirectTo: '/' })}
      >
        <LogOut aria-hidden />
        <span className="sr-only lg:not-sr-only">Sign out</span>
      </Button>
    </div>
  )
}

export function SiteHeader() {
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'owner'

  return (
    <header className="sticky top-0 z-40 border-b-4 border-treasure-gold/70 bg-sea-deep text-parchment shadow-md">
      <span className="scroll-progress" aria-hidden />
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4 md:h-16"
      >
        <Link
          href="/"
          className="tap -ml-1 inline-flex min-w-0 items-center gap-2 rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-treasure-gold"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper ring-2 ring-treasure-gold/80 md:size-12">
            <BrandMark size={44} priority className="size-9 md:size-11" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-xl leading-none tracking-wide uppercase md:text-2xl">
              Dinkin&apos; Pirates
            </span>
            <span className="hidden text-[10px] font-semibold tracking-[0.25em] text-treasure-gold uppercase sm:block">
              The Pickleball Club
            </span>
          </span>
          <span className="sr-only"> — back to the Dock</span>
        </Link>
        <Suspense fallback={<DesktopLinks pathname={null} isOwner={isOwner} />}>
          <ActiveDesktopLinks isOwner={isOwner} />
        </Suspense>
        <AccountArea />
      </nav>
    </header>
  )
}
