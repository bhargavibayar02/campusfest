import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { Event } from '../models/Event.js'
import { Registration } from '../models/Registration.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { Feedback } from '../models/Feedback.js'
import { VolunteerApplication } from '../models/VolunteerApplication.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  if (req.user.role === 'student') {
    const [registrations, notifications, feedback] = await Promise.all([
      Registration.find({ student: req.user.id }).select('+attendanceToken').populate('event', 'title venue startAt category status').sort({ createdAt: -1 }).limit(12).lean(),
      Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(8).lean(),
      Feedback.find({ student: req.user.id }).select('event').lean(),
    ])
    return res.json({ success: true, data: { role: req.user.role, registrations, notifications, feedbackEventIds: feedback.map(({ event }) => event.toString()) } })
  }
  if (req.user.role === 'volunteer') {
    const applications = await VolunteerApplication.find({ volunteer: req.user.id }).populate('event', 'title venue startAt endAt').sort({ createdAt: -1 }).lean()
    return res.json({ success: true, data: { role: req.user.role, applications } })
  }
  const eventFilter = req.user.role === 'administrator' ? {} : { organiser: req.user.id }
  const events = await Event.find(eventFilter).sort({ startAt: 1 }).lean()
  const eventIds = events.map(({ _id }) => _id)
  const [registrationCount, attendanceCount, feedback] = await Promise.all([
    Registration.countDocuments({ event: { $in: eventIds }, status: { $ne: 'cancelled' } }),
    Registration.countDocuments({ event: { $in: eventIds }, status: 'attended' }),
    Feedback.aggregate([{ $match: { event: { $in: eventIds } } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ])
  const data = { role: req.user.role, events, metrics: { eventCount: events.length, registrationCount, attendanceCount, averageRating: feedback[0]?.average ?? 0, feedbackCount: feedback[0]?.count ?? 0 } }
  if (req.user.role === 'administrator') {
    data.metrics.userCount = await User.countDocuments()
  }
  res.json({ success: true, data })
})

router.get('/notifications', requireAuth, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50).lean()
  res.json({ success: true, data: { notifications } })
})

export default router
