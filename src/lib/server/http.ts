import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { z } from 'zod'
import { isValidObjectId } from 'mongoose'
import { formatZodError } from './validation'

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/** Wraps a route handler: HttpError -> `{ error }` with its status; anything else -> 500. */
export function withErrors<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (err) {
      // Let Next.js internal control-flow errors (prerender bailouts, redirect, notFound) through.
      unstable_rethrow(err)
      if (err instanceof HttpError) return errorResponse(err.status, err.message)
      console.error('[api] unhandled error', err)
      return errorResponse(500, 'Something went wrong')
    }
  }
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new HttpError(400, formatZodError(parsed.error))
  return parsed.data
}

export function parseQuery<T extends z.ZodType>(params: URLSearchParams, schema: T): z.infer<T> {
  const parsed = schema.safeParse(Object.fromEntries(params))
  if (!parsed.success) throw new HttpError(400, formatZodError(parsed.error))
  return parsed.data
}

/** Path ids: anything that is not a valid ObjectId is simply "not found". */
export function assertObjectId(id: string, what = 'Resource'): void {
  if (!/^[a-f\d]{24}$/i.test(id) || !isValidObjectId(id))
    throw new HttpError(404, `${what} not found`)
}

/** Client IP for hashing only (never stored raw). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return fwd || headers.get('x-real-ip') || 'unknown'
}
