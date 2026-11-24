import 'server-only'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, FbEvent } from '@/lib/db/models'
import { goUrl, isPublicVoyageLive } from '@/lib/voyage'
import {
  buildDmText,
  buildPostMessage,
  extractBookingTag,
  isLinkKeyword,
  isTopLevelComment,
  type CommentEvent,
} from './fb-pure'
import type { BookingLean } from './serializers'

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION ?? 'v23.0'
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

export interface FbConfig {
  pageId: string
  accessToken: string
}

/** Page publishing / messaging config, or null when FB env vars are not set. */
export function getFbConfig(): FbConfig | null {
  const pageId = process.env.FB_PAGE_ID
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN
  return pageId && accessToken ? { pageId, accessToken } : null
}

async function graph<T>(
  cfg: FbConfig,
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  // Token goes in the Authorization header, never in a logged URL.
  const headers: Record<string, string> = { Authorization: `Bearer ${cfg.accessToken}` }
  const signal = AbortSignal.timeout(10_000)
  const query = new URLSearchParams(params as Record<string, string>).toString()
  const res =
    method === 'GET'
      ? await fetch(`${GRAPH}${path}?${query}`, {
          method: 'GET',
          headers,
          signal,
        })
      : await fetch(`${GRAPH}${path}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal,
        })
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!res.ok)
    throw new Error(`Graph API ${res.status}: ${json.error?.message ?? 'request failed'}`)
  return json
}

/** Publishes the section 8 post to the Page feed; returns the Page post id. */
export async function publishVoyagePost(cfg: FbConfig, booking: BookingLean): Promise<string> {
  const message = buildPostMessage({ bookingId: String(booking._id), startAt: booking.startAt })
  const res = await graph<{ id: string }>(cfg, 'POST', `/${cfg.pageId}/feed`, { message })
  return res.id
}

interface PrivateReplyResult {
  recipient_id?: string
  message_id?: string
}

/** Messenger private reply to a comment (one allowed per comment by Facebook). */
export async function sendPrivateReply(
  cfg: FbConfig,
  commentId: string,
  text: string,
): Promise<PrivateReplyResult> {
  return graph<PrivateReplyResult>(cfg, 'POST', `/${cfg.pageId}/messages`, {
    recipient: { comment_id: commentId },
    message: { text },
  })
}

async function resolveBookingId(cfg: FbConfig, e: CommentEvent): Promise<string | null> {
  const byPost = await Booking.findOne({ fbPostId: e.postId }, { _id: 1 }).lean<{ _id: unknown }>()
  if (byPost) return String(byPost._id)
  // Fallback: read the post text and look for the #dp-<bookingId> tag.
  try {
    const post = await graph<{ message?: string }>(cfg, 'GET', `/${e.postId}`, {
      fields: 'message',
    })
    return extractBookingTag(post.message)
  } catch (err) {
    console.error('[fb] could not read post for tag lookup', err)
    return null
  }
}

export type CommentOutcome =
  | 'ignored'
  | 'unknown-post'
  | 'not-live'
  | 'duplicate'
  | 'sent'
  | 'failed'

/** Handles one comment event. Never DMs for cancelled / expired / private voyages. */
export async function handleCommentEvent(e: CommentEvent): Promise<CommentOutcome> {
  const cfg = getFbConfig()
  if (!cfg) return 'ignored'
  if (!isLinkKeyword(e.message) || !isTopLevelComment(e)) return 'ignored'
  if (e.fromId && e.fromId === cfg.pageId) return 'ignored' // our own Page comment

  await connectDB()
  const already = await FbEvent.findOne({ commentId: e.commentId }).lean<{ action: string }>()
  if (already?.action === 'sent') return 'duplicate'

  const bookingId = await resolveBookingId(cfg, e)
  if (!bookingId || !/^[a-f\d]{24}$/i.test(bookingId)) return 'unknown-post'
  const booking = await Booking.findById(bookingId).lean<BookingLean>()
  if (!booking || !isPublicVoyageLive(booking)) return 'not-live'

  let action: 'sent' | 'failed' = 'sent'
  let psid: string | null = null
  try {
    const res = await sendPrivateReply(cfg, e.commentId, buildDmText(goUrl(bookingId, 'messenger')))
    psid = res.recipient_id ?? null
  } catch (err) {
    console.error('[fb] private reply failed', err)
    action = 'failed'
  }
  await FbEvent.findOneAndUpdate(
    { commentId: e.commentId },
    { $set: { bookingId, psid, action } },
    { upsert: true },
  )
  return action
}
