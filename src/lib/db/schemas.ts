// Schema + model definitions. No 'server-only' import so scripts/seed.ts can use them.
import mongoose, { Schema, type Model, type Types } from 'mongoose'
import type {
  BookingStatus,
  BookingType,
  ClickSource,
  Tier,
  UserRole,
  VoyageVisibility,
} from '@/types'

// Explicit document types. (InferSchemaType on these schemas sends tsc into an
// out-of-memory loop during `next build`, so the shapes are spelled out here.)
export interface UserDoc {
  name: string
  email: string
  avatar: string | null
  role: UserRole
  points: number
  tier: Tier
  createdAt: Date
}

export interface CourtDoc {
  name: string
  surface: string
  indoor: boolean
  pricePerHour: number
  currency: string
  openHours: { start: string; end: string }
  photoUrls: string[]
  active: boolean
}

export interface BookingDoc {
  courtId: Types.ObjectId
  userId: Types.ObjectId
  type: BookingType
  startAt: Date
  endAt: Date
  status: BookingStatus
  paymentIntentId: string | null
  reclubUrl: string | null
  voyageVisibility: VoyageVisibility | null
  voyageTitle: string | null
  externalId: string | null
  fbPostId: string | null
  cancelledAt: Date | null
  createdAt: Date
}

export interface VoyageClickDoc {
  bookingId: Types.ObjectId
  source: ClickSource
  userAgent: string | null
  ipHash: string | null
  createdAt: Date
}

export interface FbEventDoc {
  bookingId: Types.ObjectId
  commentId: string
  psid: string | null
  action: 'sent' | 'failed'
  createdAt: Date
}

// ---------- users ----------
const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    avatar: { type: String, default: null },
    role: { type: String, enum: ['player', 'organizer', 'owner'], default: 'player' },
    points: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ['deckhand', 'buccaneer', 'firstMate', 'captain', 'legend'],
      default: 'deckhand',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)
userSchema.index({ email: 1 }, { unique: true })

// ---------- courts ----------
const courtSchema = new Schema<CourtDoc>(
  {
    name: { type: String, required: true },
    surface: { type: String, required: true },
    indoor: { type: Boolean, default: false },
    pricePerHour: { type: Number, required: true },
    currency: { type: String, default: 'PHP' },
    openHours: {
      start: { type: String, required: true }, // "HH:mm"
      end: { type: String, required: true },
    },
    photoUrls: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: false },
)

// ---------- bookings ----------
const bookingSchema = new Schema<BookingDoc>(
  {
    courtId: { type: Schema.Types.ObjectId, ref: 'Court', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['charter', 'voyage'], required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    paymentIntentId: { type: String, default: null },
    // Plain string — never store Reclub-derived data.
    reclubUrl: { type: String, default: null },
    voyageVisibility: { type: String, enum: ['private', 'public', null], default: null },
    voyageTitle: { type: String, default: null, maxlength: 80 },
    // Normalized Reclub identifier, only used for dedupe.
    externalId: { type: String, default: null },
    // Facebook Page post id ("{pageId}_{postId}") once published to the Page.
    fbPostId: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)
bookingSchema.index({ courtId: 1, startAt: 1 })
bookingSchema.index({ status: 1, startAt: 1 })
bookingSchema.index({ type: 1, voyageVisibility: 1, startAt: 1 })
bookingSchema.index({ externalId: 1 }, { sparse: true })
bookingSchema.index({ fbPostId: 1 }, { partialFilterExpression: { fbPostId: { $type: 'string' } } })

// ---------- voyage_clicks ----------
const voyageClickSchema = new Schema<VoyageClickDoc>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    source: { type: String, enum: ['landing', 'messenger', 'fb', 'qr'], required: true },
    userAgent: { type: String, default: null },
    ipHash: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'voyage_clicks' },
)
voyageClickSchema.index({ bookingId: 1, createdAt: -1 })

// ---------- fb_events ----------
const fbEventSchema = new Schema<FbEventDoc>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    commentId: { type: String, required: true },
    psid: { type: String, default: null },
    action: { type: String, enum: ['sent', 'failed'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'fb_events' },
)
fbEventSchema.index({ commentId: 1 }, { unique: true })

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema)
}

export const User = model<UserDoc>('User', userSchema)
export const Court = model<CourtDoc>('Court', courtSchema)
export const Booking = model<BookingDoc>('Booking', bookingSchema)
export const VoyageClick = model<VoyageClickDoc>('VoyageClick', voyageClickSchema)
export const FbEvent = model<FbEventDoc>('FbEvent', fbEventSchema)
