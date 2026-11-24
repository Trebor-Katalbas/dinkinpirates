// Reclub URL helpers. We only validate and normalize the organizer's link —
// we never fetch, scrape, or read anything from Reclub.

const RECLUB_HOST = /(^|\.)reclub\.co$/i

export type ReclubParse =
  | { ok: true; url: string; externalId: string }
  | { ok: false; error: string }

/** Validates https:// + reclub.co domain and returns a canonical URL + dedupe key. */
export function parseReclubUrl(input: string): ReclubParse {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    return { ok: false, error: 'Enter a full link starting with https://' }
  }
  if (u.protocol !== 'https:') return { ok: false, error: 'Reclub links must use https://' }
  if (!RECLUB_HOST.test(u.hostname)) return { ok: false, error: 'Link must be on reclub.co' }
  if (u.username || u.password) return { ok: false, error: 'Invalid link' }

  const path = u.pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { ok: false, error: 'Paste the link to a specific Reclub open play' }

  const host = u.hostname.toLowerCase()
  // Drop query/fragment from the key so the same event dedupes to one attachment.
  const externalId = `${host.replace(/^www\./, '')}${path.toLowerCase()}`
  const url = `https://${host}${path}${u.search}`
  return { ok: true, url, externalId }
}
