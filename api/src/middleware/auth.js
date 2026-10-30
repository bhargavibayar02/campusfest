import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.campusfest_session
    if (!token) return res.status(401).json({ success: false, error: 'Authentication required.' })
    const payload = jwt.verify(token, config.JWT_SECRET)
    const user = await User.findById(payload.sub).select('name email role active')
    if (!user || !user.active) return res.status(401).json({ success: false, error: 'Session is no longer valid.' })
    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, error: 'Session is invalid or expired.' })
    }
    next(error)
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to perform this action.' })
    }
    next()
  }
}

export function requireSameOrigin(req, res, next) {
  const origin = req.get('origin')
  if (origin && origin !== config.FRONTEND_URL && !(config.NODE_ENV !== 'production' && origin === 'http://localhost:5173')) {
    return res.status(403).json({ success: false, error: 'Request origin is not allowed.' })
  }
  next()
}
