import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Event } from '../models/Event.js'
import { AuditLog } from '../models/AuditLog.js'
import { requireAuth, requireRole, requireSameOrigin } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireRole('administrator'))

router.get('/users', async (req, res) => {
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page)
  const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit)
  const [users, total] = await Promise.all([
    User.find().select('name email role active createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(),
  ])
  res.json({ success: true, data: { users, pagination: { page, limit, total } } })
})

router.patch('/users/:id', requireSameOrigin, async (req, res) => {
  const values = z.object({ role: z.enum(['student', 'organiser', 'volunteer', 'administrator']).optional(), active: z.boolean().optional() }).strict().parse(req.body)
  if (req.params.id === req.user.id && values.active === false) return res.status(400).json({ success: false, error: 'You cannot suspend your own account.' })
  const user = await User.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true }).select('name email role active')
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' })
  await AuditLog.create({ actor: req.user.id, action: 'user.updated', targetType: 'User', targetId: user.id, details: values })
  res.json({ success: true, data: { user } })
})

router.get('/events', async (_req, res) => {
  const events = await Event.find().populate('organiser', 'name email').sort({ createdAt: -1 }).lean()
  res.json({ success: true, data: { events } })
})

router.get('/audit-log', async (_req, res) => {
  const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(100).lean()
  res.json({ success: true, data: { logs } })
})

export default router
