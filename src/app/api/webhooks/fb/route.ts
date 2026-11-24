import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { handleCommentEvent } from '@/lib/server/facebook'
import { extractCommentEvents, verifySignature } from '@/lib/server/fb-pure'
import { errorResponse, withErrors } from '@/lib/server/http'

/** Meta webhook verification handshake. */
export const GET = withErrors(async (req: NextRequest) => {
  const token = process.env.FB_VERIFY_TOKEN
  if (!token) return errorResponse(503, 'FB_VERIFY_TOKEN is not configured')
  const sp = req.nextUrl.searchParams
  const given = Buffer.from(sp.get('hub.verify_token') ?? '')
  const want = Buffer.from(token)
  const ok =
    sp.get('hub.mode') === 'subscribe' &&
    given.length === want.length &&
    timingSafeEqual(given, want)
  const challenge = sp.get('hub.challenge')
  if (!ok || !challenge) return errorResponse(403, 'Verification failed')
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
})

/** Page feed events: a top-level comment of exactly LINK on a tagged voyage post gets a DM. */
export const POST = withErrors(async (req: NextRequest) => {
  const secret = process.env.FB_APP_SECRET
  if (!secret) return errorResponse(503, 'FB_APP_SECRET is not configured')
  const raw = await req.text()
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'), secret)) {
    return errorResponse(401, 'Invalid signature')
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return errorResponse(400, 'Invalid JSON')
  }
  const results: string[] = []
  for (const event of extractCommentEvents(payload)) {
    try {
      results.push(await handleCommentEvent(event))
    } catch (err) {
      // Still ack with 200 so Meta does not retry-storm; the error is logged.
      console.error('[fb] comment handling failed', err)
      results.push('error')
    }
  }
  return Response.json({ ok: true, results })
})
