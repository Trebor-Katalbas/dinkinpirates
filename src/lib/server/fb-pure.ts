// Pure Facebook helpers (signature check, payload parsing, copy). No network, no DB.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { formatVenueDate, formatVenueTime } from '@/lib/time'

/**
 * Post <-> booking mapping: when we publish a voyage we store the returned post id on
 * `booking.fbPostId` (primary lookup) and also append the tag `#dp-<bookingId>` to the post
 * text (fallback for posts whose id we did not store; read back via Graph `?fields=message`).
 */
export const BOOKING_TAG_PREFIX = '#dp-'

export function bookingTag(bookingId: string): string {
  return `${BOOKING_TAG_PREFIX}${bookingId}`
}

export function extractBookingTag(message: string | null | undefined): string | null {
  const m = /#dp-([a-f\d]{24})\b/i.exec(message ?? '')
  return m ? m[1] : null
}

/** Verifies Meta's `x-hub-signature-256: sha256=<hex>` over the raw request body. */
export function verifySignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header?.startsWith('sha256=') || !appSecret) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  const given = Buffer.from(header.slice('sha256='.length), 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** Comment keyword is exactly "LINK" (case-insensitive, surrounding whitespace ignored). */
export function isLinkKeyword(message: string | null | undefined): boolean {
  return /^LINK$/i.test((message ?? '').trim())
}

export interface CommentEvent {
  commentId: string
  postId: string
  parentId: string | null
  message: string
  fromId: string | null
}

interface FeedChangeValue {
  item?: string
  verb?: string
  comment_id?: string
  post_id?: string
  parent_id?: string
  message?: string
  from?: { id?: string }
}

/** Pulls newly added top-level comment events out of a Page webhook payload. */
export function extractCommentEvents(payload: unknown): CommentEvent[] {
  const out: CommentEvent[] = []
  const entries = (payload as { entry?: unknown } | null)?.entry
  if (!Array.isArray(entries)) return out
  for (const entry of entries as { changes?: unknown }[]) {
    if (!Array.isArray(entry?.changes)) continue
    for (const change of entry.changes as { field?: string; value?: FeedChangeValue }[]) {
      const v = change?.value
      if (change?.field !== 'feed' || !v) continue
      if (v.item !== 'comment' || v.verb !== 'add') continue
      if (!v.comment_id || !v.post_id) continue
      out.push({
        commentId: v.comment_id,
        postId: v.post_id,
        parentId: v.parent_id ?? null,
        message: v.message ?? '',
        fromId: v.from?.id ?? null,
      })
    }
  }
  return out
}

export function isTopLevelComment(e: CommentEvent): boolean {
  return !e.parentId || e.parentId === e.postId
}

/** CLAUDE.md section 8 post template. */
export function buildPostMessage(input: {
  bookingId: string
  startAt: Date
  title?: string | null
}): string {
  const date = formatVenueDate(input.startAt)
  const time = formatVenueTime(input.startAt)
  return [
    `⚓ Court booked ${date} ${time}. Organizer shared a Reclub open play link. Comment LINK and we'll DM it. Availability is managed on Reclub.`,
    bookingTag(input.bookingId),
  ].join('\n\n')
}

export function buildDmText(url: string): string {
  return `Here's the organizer's Reclub link: ${url} Roster and availability are managed on Reclub.`
}
