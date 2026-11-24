import 'server-only'
import { auth } from '@/auth'
import type { UserRole } from '@/types'
import { HttpError } from './http'

export interface SessionUser {
  id: string
  role: UserRole
}

/** Returns the signed-in user or throws a 401 (handled by withErrors). */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) throw new HttpError(401, 'Sign in required')
  return { id, role: session.user.role }
}

/** Returns the signed-in owner or throws 401/403. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'owner') throw new HttpError(403, 'Owner access required')
  return user
}
