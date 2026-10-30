import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { z } from 'zod'
import { config } from './config.js'
import { User } from './models/User.js'

const organiserInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
})

const values = organiserInput.parse({
  name: process.env.PROVISION_ORGANISER_NAME,
  email: process.env.PROVISION_ORGANISER_EMAIL,
  password: process.env.PROVISION_ORGANISER_PASSWORD,
})

if (config.NODE_ENV !== 'production') {
  throw new Error('Use this one-time account provisioner only with the production database.')
}

if (/localhost|127\.0\.0\.1/i.test(config.MONGODB_URI)) {
  throw new Error('The production organiser provisioner requires a remote MongoDB connection.')
}

let operationError
try {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  if (await User.exists({ email: values.email })) {
    throw new Error('An account with this email already exists; no account was changed.')
  }
  const passwordHash = await bcrypt.hash(values.password, 12)
  await User.create({
    name: values.name,
    email: values.email,
    passwordHash,
    role: 'organiser',
  })
  console.log('Production organiser account created.')
} catch (error) {
  operationError = error
  throw error
} finally {
  try {
    await mongoose.disconnect()
  } catch (disconnectError) {
    if (!operationError) throw disconnectError
    console.error('Database disconnect also failed:', disconnectError.message)
  }
}
