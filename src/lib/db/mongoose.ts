import 'server-only'
import mongoose from 'mongoose'

declare global {
  var __mongoose:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined
}

const cached = (globalThis.__mongoose ??= { conn: null, promise: null })

/** Cached Mongoose connection (survives HMR in dev). */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local.')
  cached.promise ??= mongoose.connect(uri, { bufferCommands: false })
  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }
  return cached.conn
}
