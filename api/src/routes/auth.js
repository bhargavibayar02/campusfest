import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { config } from '../config.js'
import { User } from '../models/User.js'
import { requireAuth, requireSameOrigin } from '../middleware/auth.js'
import { sendWelcome } from '../services/email.js'

const router = Router()
const credentials = z.object({
  email: z.string().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
})
const registration = credentials.extend({
  name: z.string().trim().min(2).max(100),
  department: z.string().trim().max(100).optional(),
  yearOfStudy: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().int().min(1).max(8).optional()),
  role: z.enum(['student', 'volunteer']).default('student'),
})

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    yearOfStudy: user.yearOfStudy || '',
  }
}

function setSession(res, user) {
  const token = jwt.sign({ sub: user.id }, config.JWT_SECRET, { expiresIn: '2h', issuer: 'campusfest-api' })
  res.cookie('campusfest_session', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 2 * 60 * 60 * 1000,
    path: '/',
  })
}

router.post('/register', requireSameOrigin, async (req, res) => {
  const values = registration.parse(req.body)
  const passwordHash = await bcrypt.hash(values.password, 12)
  const user = await User.create({ ...values, passwordHash })
  setSession(res, user)
  const email = await sendWelcome({ to: user.email, name: user.name })
  res.status(201).json({ success: true, data: { user: publicUser(user), emailNotificationSent: email.sent } })
})

router.post('/login', requireSameOrigin, async (req, res) => {
  const values = credentials.parse(req.body)
  const user = await User.findOne({ email: values.email }).select('+passwordHash')
  if (!user || !user.active || !(await bcrypt.compare(values.password, user.passwordHash))) {
    return res.status(401).json({ success: false, error: 'Email or password is incorrect.' })
  }
  setSession(res, user)
  res.json({ success: true, data: { user: publicUser(user) } })
})

router.post('/logout', requireSameOrigin, (_req, res) => {
  res.clearCookie('campusfest_session', { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'strict', path: '/' })
  res.json({ success: true, data: { message: 'You have been signed out.' } })
})

router.get('/me', async (req, res, next) => {
  const token = req.cookies.campusfest_session
  if (!token) return res.json({ success: true, data: { user: null } })
  try {
    const payload = jwt.verify(token, config.JWT_SECRET)
    const user = await User.findById(payload.sub).select('name email role active department yearOfStudy')
    if (!user || !user.active) {
      res.clearCookie('campusfest_session', { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'strict', path: '/' })
      return res.json({ success: true, data: { user: null } })
    }
    res.json({ success: true, data: { user } })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.clearCookie('campusfest_session', { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'strict', path: '/' })
      return res.json({ success: true, data: { user: null } })
    }
    next(error)
  }
})

router.patch('/me', requireSameOrigin, requireAuth, async (req, res) => {
  const updates = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    department: z.string().trim().max(100).optional(),
    yearOfStudy: z.union([z.coerce.number().int().min(1).max(8), z.null()]).optional(),
  }).strict().parse(req.body)
  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true }).select('name email role department yearOfStudy active')
  res.json({ success: true, data: { user } })
})

router.post('/provision-organiser', requireSameOrigin, async (req, res) => {
  if (config.NODE_ENV !== 'development' || !config.ADMIN_BOOTSTRAP_KEY) {
    return res.status(404).json({ success: false, error: 'The development provisioning endpoint is unavailable.' })
  }
  const values = z.object({
    key: z.string().min(1),
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
  }).parse(req.body)
  const expected = Buffer.from(config.ADMIN_BOOTSTRAP_KEY)
  const supplied = Buffer.from(values.key)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ success: false, error: 'Provisioning key is invalid.' })
  }
  const passwordHash = await bcrypt.hash(values.password, 12)
  const user = await User.create({ name: values.name, email: values.email, passwordHash, role: 'organiser' })
  res.status(201).json({ success: true, data: { user: publicUser(user) } })
})

export default router
