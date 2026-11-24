import type { NextRequest } from 'next/server'
import { Booking } from '@/lib/db/models'
import { loadAccessibleBooking } from '@/lib/server/bookings'
import { getFbConfig, publishVoyagePost } from '@/lib/server/facebook'
import { HttpError, withErrors } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'
import { isPublicVoyageLive } from '@/lib/voyage'

export const POST = withErrors(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser()
    const booking = await loadAccessibleBooking((await params).id, user)
    const cfg = getFbConfig()
    if (!cfg) {
      throw new HttpError(
        501,
        'Facebook publishing is not configured (set FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN).',
      )
    }
    if (!isPublicVoyageLive(booking)) {
      throw new HttpError(409, 'Only a live public Open Voyage can be shared to Facebook')
    }
    if (booking.fbPostId) throw new HttpError(409, 'This voyage was already shared to Facebook')

    let postId: string
    try {
      postId = await publishVoyagePost(cfg, booking)
    } catch (err) {
      console.error('[fb] publish failed', err)
      throw new HttpError(502, 'Facebook did not accept the post')
    }
    await Booking.updateOne({ _id: booking._id }, { $set: { fbPostId: postId } })
    return Response.json({ postId }, { status: 201 })
  },
)
