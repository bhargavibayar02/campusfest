import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 8000 },
    category: { type: String, required: true, enum: ['Technology', 'Culture', 'Sports', 'Workshop', 'Other'], index: true },
    imageUrl: { type: String, trim: true, maxlength: 1000 },
    venue: { type: String, required: true, trim: true, maxlength: 200 },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    registeredCount: { type: Number, default: 0, min: 0 },
    eligibility: { type: String, trim: true, maxlength: 1000 },
    rules: { type: String, trim: true, maxlength: 3000 },
    contactEmail: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed'], default: 'draft', index: true },
    organiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    volunteersNeeded: { type: Boolean, default: false },
  },
  { timestamps: true },
)

eventSchema.index({ status: 1, startAt: 1 })
eventSchema.index({ title: 'text', description: 'text', venue: 'text' })

export const Event = mongoose.model('Event', eventSchema)
