import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { requireSameOrigin } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/errors.js'
import authRoutes from './routes/auth.js'
import eventRoutes from './routes/events.js'
import dashboardRoutes from './routes/dashboard.js'
import adminRoutes from './routes/admin.js'

export const app = express()
app.disable('x-powered-by')
if (config.NODE_ENV === 'production') app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: config.FRONTEND_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }))
app.use(express.json({
  limit: '100kb',
  verify: (req, _res, buf) => {
    req.rawBody = buf
  },
}))
app.use(cookieParser())
app.use('/api', requireSameOrigin)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { service: 'campusfest-api', status: 'ok' } })
})

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false })
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/admin', adminRoutes)
app.use(notFound)
app.use(errorHandler)
