// Zod request schemas (pure; safe to import from tests).
import { z } from 'zod'
import { isRealDate, MAX_BOOKING_HOURS } from './slots'

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(isRealDate, 'Invalid date')
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm')
export const hoursSchema = z.number().int().min(1).max(MAX_BOOKING_HOURS)

const reclubUrlInput = z.string().trim().max(500)
const titleInput = z.string().trim().max(80)
const visibilitySchema = z.enum(['private', 'public'])

export const createBookingSchema = z.object({
  courtId: objectIdSchema,
  date: dateSchema,
  startTime: timeSchema,
  hours: hoursSchema,
  type: z.enum(['charter', 'voyage']),
  reclubUrl: reclubUrlInput.nullish(),
  voyageTitle: titleInput.nullish(),
  voyageVisibility: visibilitySchema.nullish(),
})
export type CreateBookingInput = z.infer<typeof createBookingSchema>

export const patchBookingSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reschedule'),
    date: dateSchema,
    startTime: timeSchema,
    hours: hoursSchema,
  }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('setReclub'), reclubUrl: reclubUrlInput.min(1) }),
  z.object({ action: z.literal('removeReclub') }),
  z.object({ action: z.literal('setVisibility'), visibility: visibilitySchema }),
  z.object({ action: z.literal('setTitle'), voyageTitle: titleInput.nullable() }),
])
export type PatchBookingInput = z.infer<typeof patchBookingSchema>

export const slotsQuerySchema = z.object({ date: dateSchema })

export const MAX_AVAILABILITY_DAYS = 62

export const availabilityQuerySchema = z.object({
  from: dateSchema,
  days: z.coerce.number().int().min(1).max(MAX_AVAILABILITY_DAYS).default(14),
  hours: z.coerce.number().int().min(1).max(MAX_BOOKING_HOURS).default(1),
})

export const metricQuerySchema = z.object({
  metric: z.enum(['bookings-weekly', 'occupancy', 'clicks-by-source', 'tiers', 'revenue']),
  range: z.enum(['30d', '90d', '180d']).default('90d'),
})

export const voyageClickBodySchema = z.object({
  bookingId: objectIdSchema,
  source: z.enum(['landing', 'messenger', 'fb', 'qr']).default('landing'),
})

/** Human-readable first issue, e.g. "hours: Too big". */
export function formatZodError(err: z.ZodError): string {
  const issue = err.issues[0]
  if (!issue) return 'Invalid request'
  const path = issue.path.join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}
