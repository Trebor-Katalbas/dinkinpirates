import Image from 'next/image'
import { cn } from '@/lib/utils'

// Club brand artwork (supplied by the club). Swap the files in /public/brand to rebrand.
const MARK = '/brand/logo-mark.webp'
const FULL = '/brand/logo-full.webp'

/** Emblem only (no wordmark), for tight spots like the header. */
export function BrandMark({
  size = 40,
  className,
  priority,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={MARK}
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 select-none', className)}
    />
  )
}

/** Full logo with the "Dinkin' Pirates — The Pickleball Club" wordmark. */
export function BrandLogo({
  size = 240,
  className,
  priority,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={FULL}
      alt="Dinkin' Pirates — The Pickleball Club"
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={cn('select-none', className)}
    />
  )
}
