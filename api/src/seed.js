import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { User } from './models/User.js'
import { Event } from './models/Event.js'

if (config.NODE_ENV === 'production') throw new Error('The development seed script cannot run in production.')

const accounts = [
  { role: 'organiser', name: 'CampusFest Demo Organiser', env: 'SEED_ORGANISER_PASSWORD', email: 'organiser.demo@campusfest.test' },
  { role: 'student', name: 'CampusFest Demo Student', env: 'SEED_STUDENT_PASSWORD', email: 'student.demo@campusfest.test' },
  { role: 'volunteer', name: 'CampusFest Demo Volunteer', env: 'SEED_VOLUNTEER_PASSWORD', email: 'volunteer.demo@campusfest.test' },
  { role: 'administrator', name: 'CampusFest Demo Administrator', env: 'SEED_ADMIN_PASSWORD', email: 'admin.demo@campusfest.test' },
]

const missing = accounts.filter((account) => !process.env[account.env])
if (missing.length) {
  throw new Error(`Set unique development passwords before seeding: ${missing.map(({ env }) => env).join(', ')}`)
}
const invalid = accounts.filter((account) => process.env[account.env].length < 10 || process.env[account.env].length > 128)
if (invalid.length) {
  throw new Error(`Demo passwords must be 10-128 characters: ${invalid.map(({ env }) => env).join(', ')}`)
}
if (new Set(accounts.map((account) => process.env[account.env])).size !== accounts.length) {
  throw new Error('Each demo account must use a different password.')
}

let mongodInstance = null
try {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
} catch (error) {
  console.warn(`[seed] Could not connect to configured MongoDB (${config.MONGODB_URI.replace(/:[^:@]+@/, ':***@')}): ${error.message}`)
  console.log('[seed] Checking if local MongoDB is already running at 127.0.0.1:27017...')
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/campusfest', { serverSelectionTimeoutMS: 2000 })
    console.log('[seed] Connected to already-running local MongoDB at mongodb://127.0.0.1:27017/campusfest')
  } catch {
    console.log('[seed] Starting local persistent embedded MongoDB (.mongo-data)...')
    const { fileURLToPath } = await import('node:url')
    process.env.MONGOMS_DOWNLOAD_DIR = fileURLToPath(new URL('../../node_modules/.cache/mongodb-memory-server', import.meta.url))
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const fs = await import('node:fs')
    const dataDir = fileURLToPath(new URL('../../.mongo-data', import.meta.url))
    fs.mkdirSync(dataDir, { recursive: true })
    mongodInstance = await MongoMemoryServer.create({
      instance: { port: 27017, dbPath: dataDir, storageEngine: 'wiredTiger', dbName: 'campusfest' },
    })
    await mongoose.connect('mongodb://127.0.0.1:27017/campusfest', { serverSelectionTimeoutMS: 5000 })
    console.log('[seed] Connected to newly started local MongoDB at mongodb://127.0.0.1:27017/campusfest')
  }
}
try {
  const users = {}
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(process.env[account.env], 12)
    users[account.role] = await User.findOneAndUpdate(
      { email: account.email },
      { $set: { name: account.name, role: account.role, passwordHash, active: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
  }
  const now = new Date()
  const events = [
    { title: 'Signal / Build: Student Hackday', category: 'Technology', venue: 'Innovation Lab', days: 16, capacity: 120, volunteersNeeded: true, description: 'A focused day of student-led prototypes, practical workshops, and collaborative problem solving.' },
    { title: 'Afterglow: Campus Arts Night', category: 'Culture', venue: 'Open Air Theatre', days: 24, capacity: 300, volunteersNeeded: true, description: 'An evening showcase for campus music, performance, and visual arts. Registration is free.' },
    { title: 'Northfield Intercollege 5K', category: 'Sports', venue: 'Athletics Track', days: 32, capacity: 180, volunteersNeeded: false, description: 'A friendly campus run with an accessible route, warm-up session, and post-run recovery area.' },
  ]
  for (const item of events) {
    const startAt = new Date(now.getTime() + item.days * 86400000)
    startAt.setHours(10, 0, 0, 0)
    const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000)
    const registrationDeadline = new Date(startAt.getTime() - 24 * 60 * 60 * 1000)
    await Event.findOneAndUpdate(
      { title: item.title, organiser: users.organiser._id },
      { $set: { ...item, startAt, endAt, registrationDeadline, organiser: users.organiser._id, status: 'published' } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
  }
  console.log(`Seeded ${accounts.length} development accounts and ${events.length} fictional events.`)
} finally {
  await mongoose.disconnect().catch(() => {})
  if (mongodInstance) await mongodInstance.stop().catch(() => {})
}
