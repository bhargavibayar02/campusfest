import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test, { after, before } from 'node:test'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'campusfest-integration-test-secret-0123456789'
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/campusfest-test'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.SMTP_HOST = ''
process.env.SMTP_USER = ''
process.env.SMTP_PASS = ''

const { MongoMemoryServer } = await import('mongodb-memory-server')
const { User } = await import('../src/models/User.js')
const { Event } = await import('../src/models/Event.js')
const { app } = await import('../src/app.js')

let database
let server
let baseUrl
let testDatabasePath

before(async () => {
  const cacheDirectory = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
  await mkdir(cacheDirectory, { recursive: true })
  testDatabasePath = await mkdtemp(path.join(cacheDirectory, 'campusfest-integration-'))
  database = await MongoMemoryServer.create({ instance: { dbPath: testDatabasePath } })
  await mongoose.connect(database.getUri())
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}/api`
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  if (mongoose.connection.readyState) await mongoose.disconnect()
  if (database) await database.stop()
  if (testDatabasePath) await rm(testDatabasePath, { recursive: true, force: true })
})

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      origin: process.env.FRONTEND_URL,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer())
  return {
    response,
    payload: contentType.includes('application/json') ? payload.data : payload,
    error: contentType.includes('application/json') ? payload.error : undefined,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  }
}

async function createEvent(cookie, { title, capacity = 10, volunteersNeeded = true } = {}) {
  const startAt = new Date(Date.now() + 3 * 86400000)
  const result = await request('/events', {
    method: 'POST',
    cookie,
    body: {
      title,
      description: 'A practical campus event for integration testing.',
      category: 'Technology',
      venue: 'Campus Hall',
      startAt: startAt.toISOString(),
      endAt: new Date(startAt.getTime() + 3600000).toISOString(),
      registrationDeadline: new Date(startAt.getTime() - 86400000).toISOString(),
      capacity,
      volunteersNeeded,
    },
  })
  assert.equal(result.response.status, 201, result.error)
  return result.payload.event
}

async function createPrivilegedUser(role, email) {
  const passwordHash = await bcrypt.hash('IntegrationPassword123!', 4)
  return User.create({ name: `Integration ${role}`, email, role, passwordHash })
}

test('core role, event, registration, attendance, volunteer, feedback, and admin flows', async (t) => {
  const studentResult = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Student Example', email: 'student@example.test', password: 'StudentPassword123!', role: 'student', department: 'Engineering', yearOfStudy: 2 },
  })
  assert.equal(studentResult.response.status, 201, studentResult.error)
  assert.equal(studentResult.payload.user.role, 'student')
  assert.ok(studentResult.cookie)
  const studentCookie = studentResult.cookie

  const secondStudentResult = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Second Student', email: 'second@example.test', password: 'StudentPassword123!' },
  })
  assert.equal(secondStudentResult.response.status, 201)
  const secondStudentCookie = secondStudentResult.cookie

  const volunteerResult = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Volunteer Example', email: 'volunteer@example.test', password: 'VolunteerPassword123!', role: 'volunteer' },
  })
  assert.equal(volunteerResult.response.status, 201, volunteerResult.error)
  assert.equal(volunteerResult.payload.user.role, 'volunteer')
  const volunteerCookie = volunteerResult.cookie

  await t.test('public account creation and profiles enforce role boundaries', async () => {
    const privilegedSignup = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Not an organiser', email: 'attacker@example.test', password: 'StudentPassword123!', role: 'administrator' },
    })
    assert.equal(privilegedSignup.response.status, 400)

    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'student@example.test', password: 'WrongPassword123!' },
    })
    assert.equal(badLogin.response.status, 401)
    assert.match(badLogin.error, /Email or password is incorrect/)

    const updatedProfile = await request('/auth/me', {
      method: 'PATCH',
      cookie: studentCookie,
      body: { name: 'Updated Student', department: 'Design', yearOfStudy: 3 },
    })
    assert.equal(updatedProfile.response.status, 200, updatedProfile.error)
    assert.equal(updatedProfile.payload.user.name, 'Updated Student')
    assert.equal(updatedProfile.payload.user.yearOfStudy, 3)

    const attemptedRoleUpdate = await request('/auth/me', {
      method: 'PATCH',
      cookie: studentCookie,
      body: { role: 'organiser' },
    })
    assert.equal(attemptedRoleUpdate.response.status, 400)
  })

  const organiser = await createPrivilegedUser('organiser', 'organiser@example.test')
  const admin = await createPrivilegedUser('administrator', 'admin@example.test')
  const organiserLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: organiser.email, password: 'IntegrationPassword123!' },
  })
  assert.equal(organiserLogin.response.status, 200, organiserLogin.error)
  const organiserCookie = organiserLogin.cookie
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: admin.email, password: 'IntegrationPassword123!' },
  })
  assert.equal(adminLogin.response.status, 200, adminLogin.error)
  const adminCookie = adminLogin.cookie

  await t.test('event creation, publication, discovery, and ownership are enforced', async () => {
    const deniedCreate = await request('/events', {
      method: 'POST',
      cookie: studentCookie,
      body: { title: 'Forbidden event' },
    })
    assert.equal(deniedCreate.response.status, 403)

    const event = await createEvent(organiserCookie, { title: 'Core Flow Workshop' })
    const unpublished = await request(`/events?search=Core%20Flow`)
    assert.equal(unpublished.response.status, 200)
    assert.equal(unpublished.payload.events.some((item) => item._id === event._id), false)

    const published = await request(`/events/${event._id}/publish`, { method: 'POST', cookie: organiserCookie, body: {} })
    assert.equal(published.response.status, 200, published.error)

    const found = await request('/events?search=Core%20Flow&category=Technology&page=1&limit=5')
    assert.equal(found.response.status, 200, found.error)
    assert.equal(found.payload.events[0]._id, event._id)
    assert.equal(found.payload.pagination.total, 1)

    const otherOrganiser = await createPrivilegedUser('organiser', 'other-organiser@example.test')
    const otherLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: otherOrganiser.email, password: 'IntegrationPassword123!' },
    })
    const deniedParticipants = await request(`/events/${event._id}/participants`, { cookie: otherLogin.cookie })
    assert.equal(deniedParticipants.response.status, 403)
  })

  const event = await createEvent(organiserCookie, { title: 'Volunteer Attendance Workshop', capacity: 2 })
  await request(`/events/${event._id}/publish`, { method: 'POST', cookie: organiserCookie, body: {} })

  await t.test('volunteer applications are reviewable, assignable, and scoped', async () => {
    const applicationResult = await request(`/events/volunteer/${event._id}/apply`, {
      method: 'POST',
      cookie: volunteerCookie,
      body: { roleInterest: 'Registration desk' },
    })
    assert.equal(applicationResult.response.status, 201, applicationResult.error)
    const applicationId = applicationResult.payload.application._id

    const duplicateApplication = await request(`/events/volunteer/${event._id}/apply`, {
      method: 'POST',
      cookie: volunteerCookie,
      body: { roleInterest: 'Welcome desk' },
    })
    assert.equal(duplicateApplication.response.status, 409)

    const deniedCheckIn = await request(`/events/${event._id}/check-in`, {
      method: 'POST',
      cookie: volunteerCookie,
      body: { token: 'x'.repeat(48) },
    })
    assert.equal(deniedCheckIn.response.status, 403)

    const listed = await request(`/events/${event._id}/volunteers`, { cookie: organiserCookie })
    assert.equal(listed.response.status, 200, listed.error)
    assert.equal(listed.payload.applications[0].volunteer.email, 'volunteer@example.test')

    const assignment = await request(`/events/volunteers/${applicationId}`, {
      method: 'PATCH',
      cookie: organiserCookie,
      body: { status: 'accepted', duty: 'Registration desk', shift: 'Morning' },
    })
    assert.equal(assignment.response.status, 200, assignment.error)
    assert.equal(assignment.payload.application.volunteer.email, 'volunteer@example.test')
    assert.equal(assignment.payload.application.duty, 'Registration desk')

    const volunteerWorkspace = await request('/dashboard', { cookie: volunteerCookie })
    assert.equal(volunteerWorkspace.payload.applications[0].status, 'accepted')

    const otherOrganiser = await User.findOne({ email: 'other-organiser@example.test' })
    const otherLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: otherOrganiser.email, password: 'IntegrationPassword123!' },
    })
    const deniedAssignment = await request(`/events/volunteers/${applicationId}`, {
      method: 'PATCH',
      cookie: otherLogin.cookie,
      body: { status: 'declined' },
    })
    assert.equal(deniedAssignment.response.status, 403)
  })

  await t.test('free registration, capacity, check-in, certificates, CSV, and feedback work', async () => {
    const registrationResult = await request(`/events/${event._id}/register`, {
      method: 'POST',
      cookie: studentCookie,
    })
    assert.equal(registrationResult.response.status, 201, registrationResult.error)
    const registration = registrationResult.payload.registration
    assert.equal(registration.status, 'confirmed')
    assert.ok(registration.attendanceToken)

    const duplicateRegistration = await request(`/events/${event._id}/register`, {
      method: 'POST',
      cookie: studentCookie,
    })
    assert.equal(duplicateRegistration.response.status, 409)

    const deniedFeedback = await request(`/events/${event._id}/feedback`, {
      method: 'POST',
      cookie: studentCookie,
      body: { rating: 5, comment: 'Too early' },
    })
    assert.equal(deniedFeedback.response.status, 403)

    const checkIn = await request(`/events/${event._id}/check-in`, {
      method: 'POST',
      cookie: volunteerCookie,
      body: { token: registration.attendanceToken },
    })
    assert.equal(checkIn.response.status, 200, checkIn.error)
    assert.equal(checkIn.payload.registration.student, 'Updated Student')

    const repeatedCheckIn = await request(`/events/${event._id}/check-in`, {
      method: 'POST',
      cookie: organiserCookie,
      body: { token: registration.attendanceToken },
    })
    assert.equal(repeatedCheckIn.response.status, 404)

    const certificate = await request(`/events/registrations/${registration._id}/certificate`, { cookie: studentCookie })
    assert.equal(certificate.response.status, 200)
    assert.equal(certificate.payload.subarray(0, 5).toString(), '%PDF-')

    const otherCertificate = await request(`/events/registrations/${registration._id}/certificate`, { cookie: secondStudentCookie })
    assert.equal(otherCertificate.response.status, 404)

    const feedbackResult = await request(`/events/${event._id}/feedback`, {
      method: 'POST',
      cookie: studentCookie,
      body: { rating: 5, comment: 'Great event' },
    })
    assert.equal(feedbackResult.response.status, 201, feedbackResult.error)

    const duplicateFeedback = await request(`/events/${event._id}/feedback`, {
      method: 'POST',
      cookie: studentCookie,
      body: { rating: 4, comment: 'Second review' },
    })
    assert.equal(duplicateFeedback.response.status, 409)

    const report = await request(`/events/${event._id}/feedback`, { cookie: organiserCookie })
    assert.equal(report.payload.summary.count, 1)
    assert.equal(report.payload.summary.average, 5)

    const csv = await request(`/events/${event._id}/participants.csv`, { cookie: organiserCookie })
    assert.equal(csv.response.status, 200)
    assert.match(csv.response.headers.get('content-type'), /text\/csv/)
    assert.match(csv.payload.toString(), /Updated Student/)

    const studentDashboard = await request('/dashboard', { cookie: studentCookie })
    assert.equal(studentDashboard.payload.registrations[0].status, 'attended')
    assert.equal(studentDashboard.payload.notifications.length, 1)
  })

  await t.test('capacity contention, cancellation, and admin audit behavior work', async () => {
    const capacityEvent = await createEvent(organiserCookie, { title: 'Single Seat Workshop', capacity: 1, volunteersNeeded: false })
    await request(`/events/${capacityEvent._id}/publish`, { method: 'POST', cookie: organiserCookie, body: {} })
    const reservations = await Promise.all([
      request(`/events/${capacityEvent._id}/register`, { method: 'POST', cookie: studentCookie }),
      request(`/events/${capacityEvent._id}/register`, { method: 'POST', cookie: secondStudentCookie }),
    ])
    assert.deepEqual(reservations.map(({ response }) => response.status).sort(), [201, 409])
    const refreshedCapacityEvent = await Event.findById(capacityEvent._id)
    assert.equal(refreshedCapacityEvent.registeredCount, 1)

    const selfCancellationEvent = await createEvent(organiserCookie, { title: 'Self Cancellation Workshop', volunteersNeeded: false })
    await request(`/events/${selfCancellationEvent._id}/publish`, { method: 'POST', cookie: organiserCookie, body: {} })
    const selfCancellationRegistration = await request(`/events/${selfCancellationEvent._id}/register`, {
      method: 'POST',
      cookie: secondStudentCookie,
    })
    const selfCancellation = await request(`/events/registrations/${selfCancellationRegistration.payload.registration._id}/cancel`, {
      method: 'POST',
      cookie: secondStudentCookie,
      body: {},
    })
    assert.equal(selfCancellation.response.status, 200, selfCancellation.error)
    assert.equal(selfCancellation.payload.registration.status, 'cancelled')
    assert.equal(selfCancellation.payload.registration.attendanceToken, undefined)
    assert.equal((await Event.findById(selfCancellationEvent._id)).registeredCount, 0)

    const cancellationEvent = await createEvent(organiserCookie, { title: 'Cancellation Workshop', volunteersNeeded: false })
    await request(`/events/${cancellationEvent._id}/publish`, { method: 'POST', cookie: organiserCookie, body: {} })
    const cancellationRegistration = await request(`/events/${cancellationEvent._id}/register`, {
      method: 'POST',
      cookie: secondStudentCookie,
    })
    assert.equal(cancellationRegistration.response.status, 201)
    const cancellation = await request(`/events/${cancellationEvent._id}/cancel`, {
      method: 'POST',
      cookie: organiserCookie,
      body: {},
    })
    assert.equal(cancellation.response.status, 200)
    const cancelledRegistration = await mongoose.model('Registration').findById(cancellationRegistration.payload.registration._id)
    assert.equal(cancelledRegistration.status, 'cancelled')
    assert.equal(cancelledRegistration.attendanceToken, undefined)
    assert.equal((await Event.findById(cancellationEvent._id)).registeredCount, 0)

    const deletableEvent = await createEvent(organiserCookie, { title: 'Deletable Draft Workshop', volunteersNeeded: false })
    const deleted = await request(`/events/${deletableEvent._id}`, {
      method: 'DELETE',
      cookie: organiserCookie,
    })
    assert.equal(deleted.response.status, 200, deleted.error)
    assert.equal(await Event.exists({ _id: deletableEvent._id }), null)

    const unauthenticatedAdmin = await request('/admin/users')
    assert.equal(unauthenticatedAdmin.response.status, 401)
    const deniedAdmin = await request('/admin/users', { cookie: studentCookie })
    assert.equal(deniedAdmin.response.status, 403)

    const selfSuspend = await request(`/admin/users/${admin.id}`, {
      method: 'PATCH',
      cookie: adminLogin.cookie,
      body: { active: false },
    })
    assert.equal(selfSuspend.response.status, 400)

    const suspendUser = await request(`/admin/users/${secondStudentResult.payload.user.id}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { active: false },
    })
    assert.equal(suspendUser.response.status, 200, suspendUser.error)
    assert.equal(suspendUser.payload.user.active, false)

    const audit = await request('/admin/audit-log', { cookie: adminCookie })
    assert.equal(audit.response.status, 200, audit.error)
    assert.ok(audit.payload.logs.some((entry) => entry.action === 'user.updated'))
  })
})
