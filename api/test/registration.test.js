import test from 'node:test'
import assert from 'node:assert/strict'
import { Event } from '../src/models/Event.js'
import { Registration } from '../src/models/Registration.js'
import { createAttendanceCertificate } from '../src/services/certificate.js'
import { createAttendanceToken, createRegistrationReference } from '../src/services/registration.js'

test('events and registrations have no payment fields or pending payment state', () => {
  assert.equal(Event.schema.path('feePaise'), undefined)
  assert.equal(Registration.schema.path('feePaise'), undefined)
  assert.equal(Registration.schema.path('payment'), undefined)
  assert.deepEqual(Registration.schema.path('status').enumValues, ['confirmed', 'cancelled', 'attended'])
})

test('registration and attendance credentials are unique, non-trivial tokens', () => {
  const reference = createRegistrationReference()
  const token = createAttendanceToken()

  assert.match(reference, /^CF-[A-F0-9]{16}$/)
  assert.ok(token.length >= 40)
  assert.notEqual(createAttendanceToken(), token)
})

test('attendance certificates are generated as PDF documents', async () => {
  const pdf = await createAttendanceCertificate({
    name: 'Student Example',
    eventTitle: 'Campus Workshop',
    eventDate: '30 October 2026',
    reference: 'CF-0123456789ABCDEF',
  })

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.ok(pdf.length > 1000)
})
