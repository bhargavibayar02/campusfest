import fs from 'node:fs'
import mongoose from 'mongoose'
import { app } from './app.js'
import { config } from './config.js'

let mongodInstance = null

async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    return config.MONGODB_URI
  } catch (error) {
    if (config.NODE_ENV === 'development') {
      console.warn(`[dev] Could not connect to configured MongoDB (${config.MONGODB_URI.replace(/:[^:@]+@/, ':***@')}): ${error.message}`)
      console.log('[dev] Starting embedded MongoDB on 127.0.0.1:27017 with persistent storage (.mongo-data)...')
      try {
        const { fileURLToPath } = await import('node:url')
        process.env.MONGOMS_DOWNLOAD_DIR = fileURLToPath(new URL('../../node_modules/.cache/mongodb-memory-server', import.meta.url))
        const { MongoMemoryServer } = await import('mongodb-memory-server')
        const dataDir = fileURLToPath(new URL('../../.mongo-data', import.meta.url))
        fs.mkdirSync(dataDir, { recursive: true })
        mongodInstance = await MongoMemoryServer.create({
          instance: { port: 27017, dbPath: dataDir, storageEngine: 'wiredTiger', dbName: 'campusfest' },
        })
        const localUri = 'mongodb://127.0.0.1:27017/campusfest'
        await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 })
        console.log(`[dev] Successfully connected to embedded MongoDB at ${localUri}`)
        return localUri
      } catch (localError) {
        throw new Error(`Failed to connect to configured MongoDB and failed to start local fallback: ${localError.message}`)
      }
    }
    throw error
  }
}

async function removeLegacyPaymentFields() {
  const events = mongoose.connection.collection('events')
  const registrations = mongoose.connection.collection('registrations')
  await events.updateMany({ feePaise: { $exists: true } }, { $unset: { feePaise: '' } })

  const pending = await registrations.find({ status: 'pending_payment' }).project({ _id: 1, event: 1 }).toArray()
  for (const item of pending) {
    const result = await registrations.updateOne(
      { _id: item._id, status: 'pending_payment' },
      {
        $set: { status: 'cancelled', cancelledAt: new Date() },
        $unset: { feePaise: '', payment: '', reservationExpiresAt: '', attendanceToken: '' },
      },
    )
    if (result.modifiedCount) {
      await events.updateOne({ _id: item.event, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } })
    }
  }
  await registrations.updateMany({}, { $unset: { feePaise: '', payment: '', reservationExpiresAt: '' } })
}

try {
  await connectDatabase()
  await removeLegacyPaymentFields()
  app.listen(config.API_PORT, () => {
    console.log(`CampusFest API listening on http://localhost:${config.API_PORT}`)
  })
} catch (error) {
  console.error(`Unable to connect to MongoDB: ${error.message}`)
  process.exitCode = 1
}

const shutdown = async () => {
  await mongoose.disconnect().catch(() => {})
  if (mongodInstance) await mongodInstance.stop().catch(() => {})
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
