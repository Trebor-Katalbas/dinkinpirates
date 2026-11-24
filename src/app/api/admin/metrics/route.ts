import type { NextRequest } from 'next/server'
import { parseQuery, withErrors } from '@/lib/server/http'
import { runMetric } from '@/lib/server/metrics'
import { requireOwner } from '@/lib/server/session'
import { metricQuerySchema } from '@/lib/server/validation'

export const GET = withErrors(async (req: NextRequest) => {
  await requireOwner()
  const { metric, range } = parseQuery(req.nextUrl.searchParams, metricQuerySchema)
  return Response.json(await runMetric(metric, range))
})
