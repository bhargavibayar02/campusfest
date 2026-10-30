import mongoose from 'mongoose'

const registrationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ['confirmed', 'cancelled', 'attended'], required: true, index: true },
    attendanceToken: { type: String, unique: true, sparse: true, select: false },
    checkedInAt: { type: Date },
    certificateEmailedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
)

registrationSchema.index(
  { student: 1, event: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['confirmed', 'attended'] } } },
)
export const Registration = mongoose.model('Registration', registrationSchema)
