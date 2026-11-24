import type { NextRequest } from 'next/server'
import { assertCronAuth, completeFinishedBookings } from '@/lib/server/cron'
import { withErrors } from '@/lib/server/http'

export const GET = withErrors(async (req: NextRequest) => {
  assertCronAuth(req)
  return Response.json(await completeFinishedBookings())
})
