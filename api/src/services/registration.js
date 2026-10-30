import crypto from 'node:crypto'

export function createAttendanceToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function createRegistrationReference() {
  return `CF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}
