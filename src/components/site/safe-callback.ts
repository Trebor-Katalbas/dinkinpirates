/** Only allow same-origin relative paths as post-sign-in destinations. */
export function safeCallbackUrl(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

export function signInHref(callbackUrl: string): string {
  return `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
}
