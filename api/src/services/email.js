import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter = null
let smtpWarningLogged = false

function getTransporter() {
  if (transporter) return transporter
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) return null
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: Number(config.SMTP_PORT || 587),
    secure: Number(config.SMTP_PORT) === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  })
  return transporter
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character])

async function send({ to, subject, html, text, attachments }) {
  const t = getTransporter()
  if (!t) {
    if (!smtpWarningLogged) {
      console.warn('[email] SMTP is not configured; email notifications are disabled.')
      smtpWarningLogged = true
    }
    return { sent: false, reason: 'smtp_not_configured' }
  }
  try {
    await t.sendMail({ from: config.EMAIL_FROM || config.SMTP_USER, to, subject: String(subject).replace(/[\r\n]+/g, ' ').slice(0, 200), html, text, attachments })
    return { sent: true }
  } catch (err) {
    console.error(`[email] Delivery failed for "${subject}": ${err.message}`)
    return { sent: false, reason: 'delivery_failed' }
  }
}

export async function sendRegistrationConfirmed({ to, name, eventTitle, eventDate, venue, reference }) {
  return send({
    subject: `You're registered for ${eventTitle} 🎉`,
    to,
    text: `Hi ${name},\n\nYour free registration for "${eventTitle}" is confirmed.\n\nRef: ${reference}\nDate: ${eventDate}\nVenue: ${venue}\n\n— CampusFest`,
    html: `<p>Hi <strong>${escapeHtml(name)}</strong>,</p>
<p>Your free registration for <strong>${escapeHtml(eventTitle)}</strong> is confirmed.</p>
<ul>
  <li><strong>Reference:</strong> ${escapeHtml(reference)}</li>
  <li><strong>Date:</strong> ${escapeHtml(eventDate)}</li>
  <li><strong>Venue:</strong> ${escapeHtml(venue)}</li>
</ul>
<p>See you there! 🚀</p>
<p>— CampusFest Team</p>`,
  })
}

export async function sendEventCancelled({ to, name, eventTitle }) {
  return send({
    to,
    subject: `Event cancelled: ${eventTitle}`,
    text: `Hi ${name},\n\nWe're sorry to inform you that "${eventTitle}" has been cancelled.\n\n— CampusFest`,
    html: `<p>Hi <strong>${escapeHtml(name)}</strong>,</p>
<p>We're sorry to inform you that <strong>${escapeHtml(eventTitle)}</strong> has been cancelled by the organiser.</p>
<p>— CampusFest Team</p>`,
  })
}

export async function sendVolunteerStatus({ to, name, eventTitle, status }) {
  const label = status === 'accepted' ? 'accepted ✅' : status === 'declined' ? 'not selected this time' : 'updated'
  return send({
    to,
    subject: `Volunteer update: ${eventTitle}`,
    text: `Hi ${name},\n\nYour volunteer application for "${eventTitle}" has been ${label}.\n\n— CampusFest`,
    html: `<p>Hi <strong>${escapeHtml(name)}</strong>,</p>
<p>Your volunteer application for <strong>${escapeHtml(eventTitle)}</strong> has been <strong>${escapeHtml(label)}</strong>.</p>
<p>— CampusFest Team</p>`,
  })
}

export async function sendWelcome({ to, name }) {
  return send({
    to,
    subject: 'Welcome to CampusFest!',
    text: `Hi ${name},\n\nWelcome to CampusFest — your campus event hub.\n\nDiscover events, register, and show up.\n\n— CampusFest Team`,
    html: `<p>Hi <strong>${escapeHtml(name)}</strong>,</p>
<p>Welcome to <strong>CampusFest</strong> — your campus event hub.</p>
<p>Discover events, register, and show up. 🎓</p>
<p>— CampusFest Team</p>`,
  })
}

export async function sendCertificate({ to, name, eventTitle, eventDate, reference, pdf }) {
  return send({
    to,
    subject: `Your CampusFest attendance certificate: ${eventTitle}`,
    text: `Hi ${name},\n\nThank you for attending "${eventTitle}" on ${eventDate}. Your attendance certificate is attached.\n\nReference: ${reference}\n\n— CampusFest Team`,
    html: `<p>Hi <strong>${escapeHtml(name)}</strong>,</p>
<p>Thank you for attending <strong>${escapeHtml(eventTitle)}</strong> on ${escapeHtml(eventDate)}.</p>
<p>Your attendance certificate is attached as a PDF.</p>
<p>Reference: ${escapeHtml(reference)}</p>
<p>— CampusFest Team</p>`,
    attachments: [{ filename: `campusfest-certificate-${reference}.pdf`, content: pdf, contentType: 'application/pdf' }],
  })
}
