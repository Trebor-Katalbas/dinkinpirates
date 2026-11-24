import { after, NextResponse, type NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { Booking } from '@/lib/db/models'
import { logVoyageClick } from '@/lib/server/clicks'
import { clientIp } from '@/lib/server/http'
import type { BookingLean } from '@/lib/server/serializers'
import { parseReclubUrl } from '@/lib/reclub'
import { isRedirectable, parseClickSource } from '@/lib/voyage'

const noStore = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expired = () =>
    NextResponse.redirect(new URL('/voyages?expired=1', req.url), {
      status: 302,
      headers: noStore,
    })

  if (!/^[a-f\d]{24}$/i.test(id)) return expired()

  // Mock mode: data lives in the browser, so hand off to a client page that resolves it.
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    const target = new URL(`/mock/go/${id}`, req.url)
    target.searchParams.set('src', parseClickSource(req.nextUrl.searchParams.get('src')))
    return NextResponse.redirect(target, { status: 302, headers: noStore })
  }

  let booking: BookingLean | null = null
  try {
    await connectDB()
    booking = await Booking.findById(id, {
      type: 1,
      reclubUrl: 1,
      status: 1,
      endAt: 1,
      voyageVisibility: 1,
    }).lean<BookingLean>()
  } catch (err) {
    console.error('[go] lookup failed', err)
    return expired()
  }

  if (!booking || !isRedirectable(booking)) return expired()
  // Re-validate on the way out so a bad stored value can never become an open redirect.
  const target = booking.reclubUrl ? parseReclubUrl(booking.reclubUrl) : null
  if (!target?.ok) return expired()

  const click = {
    bookingId: id,
    source: parseClickSource(req.nextUrl.searchParams.get('src')),
    userAgent: req.headers.get('user-agent'),
    ip: clientIp(req.headers),
  }
  // Runs after the response is sent; logVoyageClick never throws, so the 302 is never blocked.
  after(() => logVoyageClick(click))

  return NextResponse.redirect(target.url, { status: 302, headers: noStore })
}
