import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  buildDmText,
  buildPostMessage,
  bookingTag,
  extractBookingTag,
  extractCommentEvents,
  isLinkKeyword,
  isTopLevelComment,
  verifySignature,
} from './fb-pure'

const sign = (body: string, secret: string) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

describe('verifySignature', () => {
  it('accepts a correct HMAC and rejects tampering', () => {
    const body = '{"a":1}'
    expect(verifySignature(body, sign(body, 's3cret'), 's3cret')).toBe(true)
    expect(verifySignature(body + ' ', sign(body, 's3cret'), 's3cret')).toBe(false)
    expect(verifySignature(body, sign(body, 'other'), 's3cret')).toBe(false)
    expect(verifySignature(body, null, 's3cret')).toBe(false)
    expect(verifySignature(body, 'sha256=zz', 's3cret')).toBe(false)
    expect(verifySignature(body, sign(body, ''), '')).toBe(false)
  })
})

describe('isLinkKeyword', () => {
  it('matches only LINK', () => {
    expect(isLinkKeyword('LINK')).toBe(true)
    expect(isLinkKeyword('  link \n')).toBe(true)
    expect(isLinkKeyword('JOIN')).toBe(false)
    expect(isLinkKeyword('link please')).toBe(false)
    expect(isLinkKeyword(undefined)).toBe(false)
  })
})

describe('extractCommentEvents', () => {
  const payload = (value: object) => ({
    object: 'page',
    entry: [{ id: 'p', changes: [{ field: 'feed', value }] }],
  })
  it('extracts added comments', () => {
    const events = extractCommentEvents(
      payload({ item: 'comment', verb: 'add', comment_id: 'c1', post_id: 'p_1', message: 'LINK' }),
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ commentId: 'c1', postId: 'p_1', message: 'LINK' })
  })
  it('ignores other items, verbs and malformed payloads', () => {
    expect(extractCommentEvents(payload({ item: 'post', verb: 'add' }))).toEqual([])
    expect(
      extractCommentEvents(
        payload({ item: 'comment', verb: 'remove', comment_id: 'c', post_id: 'p' }),
      ),
    ).toEqual([])
    expect(extractCommentEvents(null)).toEqual([])
    expect(extractCommentEvents({ entry: 'x' })).toEqual([])
  })
  it('detects replies', () => {
    const base = { commentId: 'c', postId: 'p', message: 'LINK', fromId: null }
    expect(isTopLevelComment({ ...base, parentId: 'p' })).toBe(true)
    expect(isTopLevelComment({ ...base, parentId: null })).toBe(true)
    expect(isTopLevelComment({ ...base, parentId: 'other' })).toBe(false)
  })
})

describe('post tag and copy', () => {
  const id = 'b'.repeat(24)
  it('round-trips the booking tag', () => {
    expect(extractBookingTag(`hello\n\n${bookingTag(id)}`)).toBe(id)
    expect(extractBookingTag('no tag')).toBeNull()
  })
  it('builds the section 8 post without Reclub slot language', () => {
    const msg = buildPostMessage({ bookingId: id, startAt: new Date('2026-06-02T10:00:00Z') })
    expect(msg).toContain('Comment LINK')
    expect(msg).toContain('Availability is managed on Reclub.')
    expect(msg).not.toMatch(/join|spots/i)
    expect(extractBookingTag(msg)).toBe(id)
  })
  it('DM copy follows the rules', () => {
    const dm = buildDmText('https://x/go/1?src=messenger')
    expect(dm).toContain("Here's the organizer's Reclub link: https://x/go/1?src=messenger")
    expect(dm).toContain('Roster and availability are managed on Reclub.')
  })
})
