import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'organiser', 'volunteer', 'administrator'],
      default: 'student',
      index: true,
    },
    active: { type: Boolean, default: true },
    department: { type: String, trim: true, maxlength: 100 },
    yearOfStudy: { type: Number, min: 1, max: 8 },
  },
  { timestamps: true, toJSON: { transform: (_doc, value) => { delete value.passwordHash; return value } } },
)

export const User = mongoose.model('User', userSchema)
