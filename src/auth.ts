import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { z } from 'zod'
import { connectDB } from '@/lib/db/mongoose'
import { User } from '@/lib/db/models'
import type { UserRole } from '@/types'

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: UserRole; name: string; email: string; image?: string | null }
  }
}

const devLoginEnabled =
  process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_LOGIN === 'true'

const providers: NextAuthConfig['providers'] = []

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google)

if (devLoginEnabled) {
  // Local-development sign-in: email + name, no password. Disabled in production
  // unless AUTH_DEV_LOGIN=true is set explicitly.
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev login',
      credentials: { email: { label: 'Email' }, name: { label: 'Name' } },
      authorize(raw) {
        const parsed = z
          .object({ email: z.email(), name: z.string().trim().min(1).max(60).optional() })
          .safeParse(raw)
        if (!parsed.success) return null
        const { email, name } = parsed.data
        return { id: email, email, name: name ?? email.split('@')[0] }
      },
    }),
  )
}

/** Upsert the Mongo user for a sign-in and return its id + role. */
async function syncUser(email: string, name: string, avatar: string | null) {
  await connectDB()
  const owners = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const doc = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $setOnInsert: {
        email: email.toLowerCase(),
        name,
        avatar,
        role: owners.includes(email.toLowerCase()) ? 'owner' : 'player',
        points: 0,
        tier: 'deckhand',
      },
    },
    { upsert: true, new: true },
  ).lean()
  return { id: String(doc._id), role: doc.role as UserRole }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin' },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const synced = await syncUser(user.email, user.name ?? user.email, user.image ?? null)
        token.uid = synced.id
        token.role = synced.role
      }
      return token
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string
      session.user.role = (token.role as UserRole | undefined) ?? 'player'
      return session
    },
  },
})

export const isDevLoginEnabled = devLoginEnabled
