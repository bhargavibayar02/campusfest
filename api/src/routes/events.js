import { Router } from 'express'
import { z } from 'zod'
import { Event } from '../models/Event.js'
import { Registration } from '../models/Registration.js'
import { Feedback } from '../models/Feedback.js'
import { Notification } from '../models/Notification.js'
import { VolunteerApplication } from '../models/VolunteerApplication.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole, requireSameOrigin } from '../middleware/auth.js'
import { createAttendanceToken, createRegistrationReference } from '../services/registration.js'
import { createAttendanceCertificate } from '../services/certificate.js'
import { sendCertificate, sendEventCancelled, sendRegistrationConfirmed, sendVolunteerStatus } from '../services/email.js'

const router = Router()
const categories = ['Technology', 'Culture', 'Sports', 'Workshop', 'Other']
const eventInput = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(8000),
  category: z.enum(categories),
  imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
  venue: z.string().trim().min(2).max(200),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).max(100000),
  eligibility: z.string().trim().max(1000).optional(),
  rules: z.string().trim().max(3000).optional(),
  contactEmail: z.string().email().max(254).optional().or(z.literal('')),
  volunteersNeeded: z.boolean().optional(),
})

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode })
const populateCard = { path: 'organiser', select: 'name' }

async function ownedEvent(req, eventId) {
  const event = await Event.findById(eventId)
  if (!event) throw fail(404, 'Event not found.')
  if (event.organiser.toString() !== req.user.id && req.user.role !== 'administrator') throw fail(403, 'You cannot manage this event.')
  return event
}

async function scannerEvent(req, eventId) {
  const event = await Event.findById(eventId)
  if (!event) throw fail(404, 'Event not found.')
  if (req.user.role === 'administrator' || event.organiser.toString() === req.user.id) return event
  if (req.user.role === 'volunteer') {
    const assigned = await VolunteerApplication.exists({ event: event.id, volunteer: req.user.id, status: 'accepted' })
    if (assigned) return event
  }
  throw fail(403, 'You are not assigned to check in participants for this event.')
}

router.get('/', async (req, res) => {
  const query = z.object({
    search: z.string().trim().max(100).optional(),
    category: z.enum(categories).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(40).default(12),
    sort: z.enum(['soonest', 'latest']).default('soonest'),
  }).parse(req.query)
  if (query.from && query.to && query.from > query.to) throw fail(400, 'The start of the date range must come before its end.')
  const filter = { status: 'published', startAt: { $gt: new Date() } }
  if (query.from) filter.startAt.$gte = query.from
  if (query.to) {
    const endOfDay = new Date(query.to)
    endOfDay.setUTCHours(23, 59, 59, 999)
    filter.startAt.$lte = endOfDay
  }
  if (query.category) filter.category = query.category
  if (query.search) {
    const term = new RegExp(escapeRegex(query.search), 'i')
    filter.$or = [{ title: term }, { description: term }, { venue: term }]
  }
  const [events, total] = await Promise.all([
    Event.find(filter).populate(populateCard).sort({ startAt: query.sort === 'soonest' ? 1 : -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Event.countDocuments(filter),
  ])
  res.json({ success: true, data: { events, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } } })
})

router.get('/mine/registrations', requireAuth, requireRole('student'), async (req, res) => {
  const registrations = await Registration.find({ student: req.user.id })
    .select('+attendanceToken')
    .populate({ path: 'event', select: 'title venue category startAt endAt status imageUrl' })
    .sort({ createdAt: -1 })
    .lean()
  res.json({ success: true, data: { registrations } })
})

router.get('/mine/volunteer-applications', requireAuth, requireRole('volunteer'), async (req, res) => {
  const applications = await VolunteerApplication.find({ volunteer: req.user.id }).populate('event', 'title venue startAt endAt').sort({ createdAt: -1 }).lean()
  res.json({ success: true, data: { applications } })
})

router.get('/:id', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, status: 'published' }).populate(populateCard).lean()
  if (!event) return res.status(404).json({ success: false, error: 'Event not found.' })
  res.json({ success: true, data: { event } })
})

router.post('/', requireSameOrigin, requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const values = eventInput.parse(req.body)
  if (values.endAt <= values.startAt || values.registrationDeadline >= values.startAt) throw fail(400, 'Event end time and registration deadline must be before/after the appropriate start time.')
  const event = await Event.create({ ...values, organiser: req.user.id, status: 'draft' })
  res.status(201).json({ success: true, data: { event } })
})

router.get('/manage/mine', requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const filter = req.user.role === 'administrator' ? {} : { organiser: req.user.id }
  const events = await Event.find(filter).sort({ startAt: -1 }).lean()
  res.json({ success: true, data: { events } })
})

router.patch('/:id', requireSameOrigin, requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const values = eventInput.partial().strict().parse(req.body)
  const event = await ownedEvent(req, req.params.id)
  const next = { ...event.toObject(), ...values }
  if (next.endAt <= next.startAt || next.registrationDeadline >= next.startAt) throw fail(400, 'Event end time and registration deadline must be before/after the appropriate start time.')
  if (values.capacity !== undefined && values.capacity < event.registeredCount) throw fail(409, 'Capacity cannot be lower than the number of active registrations.')
  Object.assign(event, values)
  await event.save()
  res.json({ success: true, data: { event } })
})

router.delete('/:id', requireSameOrigin, requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  if (!['draft', 'cancelled'].includes(event.status)) {
    throw fail(409, 'Only draft or cancelled events can be deleted. Cancel a published event first.')
  }

  const [registrationCount, applicationCount, feedbackCount] = await Promise.all([
    Registration.countDocuments({ event: event.id }),
    VolunteerApplication.countDocuments({ event: event.id }),
    Feedback.countDocuments({ event: event.id }),
  ])
  if (registrationCount || applicationCount || feedbackCount) {
    throw fail(409, 'This event has registration, volunteer, or feedback history and cannot be deleted.')
  }

  const result = await Event.deleteOne({ _id: event.id, status: { $in: ['draft', 'cancelled'] } })
  if (!result.deletedCount) throw fail(409, 'This event changed and could not be deleted. Refresh and try again.')
  res.json({ success: true, data: { deleted: true } })
})

router.post('/:id/publish', requireSameOrigin, requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  if (event.startAt <= new Date() || event.registrationDeadline <= new Date()) throw fail(400, 'Past events or expired registration windows cannot be published.')
  event.status = 'published'
  await event.save()
  res.json({ success: true, data: { event } })
})

router.post('/:id/cancel', requireSameOrigin, requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  event.status = 'cancelled'
  await event.save()
  const registrations = await Registration.find({ event: event.id, status: 'confirmed' })
    .populate('student', 'name email')
    .select('student')
  const studentIds = registrations.map(({ student }) => student._id)
  const cancelledRegistrations = await Registration.updateMany(
    { event: event.id, status: 'confirmed' },
    { $set: { status: 'cancelled', cancelledAt: new Date() }, $unset: { attendanceToken: 1 } },
  )
  if (cancelledRegistrations.modifiedCount > 0) {
    await Event.updateOne({ _id: event.id }, { $inc: { registeredCount: -cancelledRegistrations.modifiedCount } })
  }
  if (studentIds.length > 0) {
    await Notification.insertMany(studentIds.map((user) => ({ user, message: `The event "${event.title}" has been cancelled.` })))
    await Promise.all(registrations.map(({ student }) => sendEventCancelled({
      to: student.email,
      name: student.name,
      eventTitle: event.title,
    })))
  }
  res.json({ success: true, data: { event } })
})

router.post('/:id/register', requireSameOrigin, requireAuth, requireRole('student'), async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, status: 'published' })
  if (!event) throw fail(404, 'This event is not available for registration.')
  const now = new Date()
  if (event.startAt <= now || event.registrationDeadline <= now) throw fail(400, 'The registration deadline has passed.')
  const reserved = await Event.findOneAndUpdate(
    { _id: event.id, status: 'published', registrationDeadline: { $gt: now }, startAt: { $gt: now }, $expr: { $lt: ['$registeredCount', '$capacity'] } },
    { $inc: { registeredCount: 1 } },
    { new: true },
  )
  if (!reserved) throw fail(409, 'This event is full or registration has closed.')

  let registration
  try {
    registration = await Registration.create({
      student: req.user.id,
      event: event.id,
      reference: createRegistrationReference(),
      status: 'confirmed',
      attendanceToken: createAttendanceToken(),
    })
    await Notification.create({ user: req.user.id, message: `Your registration for "${event.title}" is confirmed.` })
    const student = await User.findById(req.user.id).select('name email')
    const email = await sendRegistrationConfirmed({
      to: student.email,
      name: student.name,
      eventTitle: event.title,
      eventDate: event.startAt.toLocaleString('en-IN'),
      venue: event.venue,
      reference: registration.reference,
    })
    res.status(201).json({ success: true, data: { registration, emailNotificationSent: email.sent } })
  } catch (error) {
    if (registration) {
      await Registration.deleteOne({ _id: registration.id })
    }
    await Event.updateOne({ _id: event.id, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } })
    if (error?.code === 11000) throw fail(409, 'You are already registered for this event.')
    throw error
  }
})

router.post('/registrations/:registrationId/cancel', requireSameOrigin, requireAuth, requireRole('student'), async (req, res) => {
  const registration = await Registration.findOne({ _id: req.params.registrationId, student: req.user.id }).populate('event')
  if (!registration) throw fail(404, 'Registration not found.')
  if (registration.status === 'cancelled') throw fail(409, 'This registration is already cancelled.')
  if (registration.status === 'attended' || registration.event.startAt <= new Date()) throw fail(400, 'This registration can no longer be cancelled.')
  registration.status = 'cancelled'
  registration.cancelledAt = new Date()
  registration.attendanceToken = undefined
  await registration.save()
  await Event.updateOne({ _id: registration.event.id, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } })
  res.json({ success: true, data: { registration } })
})

router.get('/:id/participants.csv', requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  const rows = await Registration.find({ event: event.id }).populate('student', 'name email').lean()
  const cell = (value = '') => `"${String(value).replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`
  const csv = ['Registration,Name,Email,Status,Attendance', ...rows.map((row) => [
    row.reference, row.student.name, row.student.email, row.status, row.checkedInAt ? 'attended' : 'not checked in',
  ].map(cell).join(','))].join('\r\n')
  res.type('text/csv').attachment(`campusfest-${event.id}-participants.csv`).send(csv)
})

router.get('/:id/participants', requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  const registrations = await Registration.find({ event: event.id }).populate('student', 'name email department').sort({ createdAt: -1 }).lean()
  res.json({ success: true, data: { registrations } })
})

router.post('/:id/check-in', requireSameOrigin, requireAuth, requireRole('organiser', 'volunteer', 'administrator'), async (req, res) => {
  const event = await scannerEvent(req, req.params.id)
  const { token } = z.object({ token: z.string().min(40).max(100) }).parse(req.body)
  const registration = await Registration.findOneAndUpdate(
    { event: event.id, attendanceToken: token, status: 'confirmed' },
    { $set: { status: 'attended', checkedInAt: new Date() } },
    { new: true },
  ).populate('student', 'name email')
  if (!registration) throw fail(404, 'No eligible registration was found for this pass; it may be invalid, cancelled, or already checked in.')
  const eventDate = event.startAt.toLocaleDateString('en-IN', { dateStyle: 'long' })
  let emailSent = false
  try {
    const certificate = await createAttendanceCertificate({
      name: registration.student.name,
      eventTitle: event.title,
      eventDate,
      reference: registration.reference,
    })
    const email = await sendCertificate({
      to: registration.student.email,
      name: registration.student.name,
      eventTitle: event.title,
      eventDate,
      reference: registration.reference,
      pdf: certificate,
    })
    emailSent = email.sent
    if (emailSent) {
      await Registration.updateOne({ _id: registration._id }, { $set: { certificateEmailedAt: new Date() } })
    }
  } catch (error) {
    console.error(`[certificate] Check-in succeeded but certificate delivery failed: ${error.message}`)
  }
  res.json({ success: true, data: { registration: { reference: registration.reference, student: registration.student.name, checkedInAt: registration.checkedInAt }, certificateEmailSent: emailSent } })
})

router.get('/registrations/:registrationId/certificate', requireAuth, requireRole('student'), async (req, res) => {
  const registration = await Registration.findOne({
    _id: req.params.registrationId,
    student: req.user.id,
    status: 'attended',
  }).populate('student', 'name').populate('event', 'title startAt')
  if (!registration) throw fail(404, 'An attendance certificate is available only for your checked-in registrations.')
  const pdf = await createAttendanceCertificate({
    name: registration.student.name,
    eventTitle: registration.event.title,
    eventDate: registration.event.startAt.toLocaleDateString('en-IN', { dateStyle: 'long' }),
    reference: registration.reference,
  })
  res.type('application/pdf')
    .attachment(`campusfest-certificate-${registration.reference}.pdf`)
    .send(pdf)
})

router.get('/:id/feedback', requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  const [feedback, aggregate] = await Promise.all([
    Feedback.find({ event: event.id }).populate('student', 'name').sort({ createdAt: -1 }).lean(),
    Feedback.aggregate([{ $match: { event: event._id } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ])
  res.json({ success: true, data: { feedback, summary: aggregate[0] ?? { average: 0, count: 0 } } })
})

router.post('/:id/feedback', requireSameOrigin, requireAuth, requireRole('student'), async (req, res) => {
  const { rating, comment } = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1500).default('') }).parse(req.body)
  const registration = await Registration.findOne({ event: req.params.id, student: req.user.id, status: 'attended' })
  if (!registration) throw fail(403, 'Feedback is available only after attending this event.')
  const feedback = await Feedback.create({ student: req.user.id, event: req.params.id, rating, comment })
  res.status(201).json({ success: true, data: { feedback } })
})

router.get('/volunteer/opportunities', async (_req, res) => {
  const events = await Event.find({ status: 'published', volunteersNeeded: true, startAt: { $gt: new Date() } }).select('title venue startAt endAt category').sort({ startAt: 1 }).lean()
  res.json({ success: true, data: { events } })
})

router.post('/volunteer/:id/apply', requireSameOrigin, requireAuth, requireRole('volunteer'), async (req, res) => {
  const { roleInterest } = z.object({ roleInterest: z.string().trim().min(2).max(100) }).parse(req.body)
  const event = await Event.findOne({ _id: req.params.id, status: 'published', volunteersNeeded: true, startAt: { $gt: new Date() } })
  if (!event) throw fail(404, 'This volunteer opportunity is no longer available.')
  const application = await VolunteerApplication.create({ volunteer: req.user.id, event: event.id, roleInterest })
  res.status(201).json({ success: true, data: { application } })
})

router.get('/:id/volunteers', requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const event = await ownedEvent(req, req.params.id)
  const applications = await VolunteerApplication.find({ event: event.id }).populate('volunteer', 'name email').sort({ createdAt: -1 }).lean()
  res.json({ success: true, data: { applications } })
})

router.patch('/volunteers/:applicationId', requireSameOrigin, requireAuth, requireRole('organiser', 'administrator'), async (req, res) => {
  const input = z.object({
    status: z.enum(['accepted', 'declined', 'completed']),
    duty: z.string().trim().max(200).optional(),
    shift: z.string().trim().max(200).optional(),
  }).strict().parse(req.body)
  const application = await VolunteerApplication.findById(req.params.applicationId)
    .populate('event', 'organiser title')
    .populate('volunteer', 'name email')
  if (!application) throw fail(404, 'Volunteer application not found.')
  if (application.event.organiser.toString() !== req.user.id && req.user.role !== 'administrator') throw fail(403, 'You cannot manage this volunteer application.')
  application.status = input.status
  if (input.duty !== undefined) application.duty = input.duty
  if (input.shift !== undefined) application.shift = input.shift
  await application.save()
  await Notification.create({ user: application.volunteer._id, message: `Your volunteer application for "${application.event.title}" was ${input.status}.` })
  const volunteer = application.volunteer
  const email = await sendVolunteerStatus({
    to: volunteer.email,
    name: volunteer.name,
    eventTitle: application.event.title,
    status: input.status,
  })
  res.json({ success: true, data: { application, emailNotificationSent: email.sent } })
})

export default router
