import { connection } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { Court } from '@/lib/db/models'
import { withErrors } from '@/lib/server/http'
import { toCourtDTO, type CourtLean } from '@/lib/server/serializers'

export const GET = withErrors(async () => {
  await connection()
  await connectDB()
  const courts = await Court.find({ active: true }).sort({ name: 1 }).lean<CourtLean[]>()
  return Response.json(courts.map(toCourtDTO))
})
