import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1500, default: '' },
  },
  { timestamps: true },
)

feedbackSchema.index({ student: 1, event: 1 }, { unique: true })
export const Feedback = mongoose.model('Feedback', feedbackSchema)
