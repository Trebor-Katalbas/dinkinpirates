/** 0 at the top of the page → 1 once the hero has mostly scrolled away (read per frame). */
export function heroScrollProgress(): number {
  if (typeof window === 'undefined') return 0
  return Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.85)))
}
