import mongoose from 'mongoose'

const volunteerApplicationSchema = new mongoose.Schema(
  {
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    roleInterest: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending', index: true },
    duty: { type: String, trim: true, maxlength: 200 },
    shift: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
)

volunteerApplicationSchema.index({ volunteer: 1, event: 1 }, { unique: true })
export const VolunteerApplication = mongoose.model('VolunteerApplication', volunteerApplicationSchema)
