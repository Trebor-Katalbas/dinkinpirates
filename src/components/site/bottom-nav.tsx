'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { DOCK_NAV, MAIN_NAV, isActive } from '@/components/site/nav-items'
import { cn } from '@/lib/utils'

const ITEMS = [DOCK_NAV, ...MAIN_NAV]

function Items({ pathname }: { pathname: string | null }) {
  return (
    <ul className="grid grid-cols-4">
      {ITEMS.map(({ href, short, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <li key={href}>
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium text-parchment/75 outline-none',
                'focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-treasure-gold focus-visible:ring-inset',
                active && 'text-treasure-gold',
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span aria-hidden>{short}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function ActiveItems() {
  const pathname = usePathname()
  return <Items pathname={pathname} />
}

/** Mobile-only bottom navigation. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-treasure-gold/60 bg-sea-deep pb-[env(safe-area-inset-bottom)] text-parchment md:hidden"
    >
      <Suspense fallback={<Items pathname={null} />}>
        <ActiveItems />
      </Suspense>
    </nav>
  )
}
