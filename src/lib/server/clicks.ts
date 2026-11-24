import 'server-only'
import { createHash } from 'node:crypto'
import type { ClickSource } from '@/types'
import { connectDB } from '@/lib/db/mongoose'
import { VoyageClick } from '@/lib/db/models'

export function hashIp(ip: string, salt: string = process.env.IP_HASH_SALT ?? ''): string {
  return createHash('sha256').update(`${ip}${salt}`).digest('hex')
}

export interface ClickInput {
  bookingId: string
  source: ClickSource
  userAgent: string | null
  ip: string
}

/** Records a /go click. Never throws: attribution must not break the redirect. */
export async function logVoyageClick(input: ClickInput): Promise<boolean> {
  try {
    await connectDB()
    await VoyageClick.create({
      bookingId: input.bookingId,
      source: input.source,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      ipHash: hashIp(input.ip),
    })
    return true
  } catch (err) {
    console.error('[clicks] failed to log click', err)
    return false
  }
}
