import { Anchor, CalendarPlus, Map, ScrollText, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  short: string
  icon: LucideIcon
}

export const MAIN_NAV: NavItem[] = [
  { href: '/book', label: 'Claim a Court', short: 'Claim', icon: CalendarPlus },
  { href: '/voyages', label: 'Open Voyages', short: 'Voyages', icon: Map },
  { href: '/bookings', label: 'My Bookings', short: 'Bookings', icon: ScrollText },
]

export const DOCK_NAV: NavItem = { href: '/', label: 'Dock', short: 'Dock', icon: Anchor }

export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
