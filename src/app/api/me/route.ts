import { connectDB } from '@/lib/db/mongoose'
import { User } from '@/lib/db/models'
import { HttpError, withErrors } from '@/lib/server/http'
import { toUserDTO, type UserLean } from '@/lib/server/serializers'
import { requireUser } from '@/lib/server/session'

export const GET = withErrors(async () => {
  const session = await requireUser()
  await connectDB()
  const user = await User.findById(session.id).lean<UserLean>()
  if (!user) throw new HttpError(401, 'Sign in required')
  return Response.json(toUserDTO(user))
})
