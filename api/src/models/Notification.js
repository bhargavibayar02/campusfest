import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, required: true, maxlength: 400 },
    readAt: { type: Date },
  },
  { timestamps: true },
)

export const Notification = mongoose.model('Notification', notificationSchema)
