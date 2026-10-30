import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, maxlength: 100 },
    targetType: { type: String, required: true, maxlength: 80 },
    targetId: { type: String, required: true, maxlength: 100 },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
