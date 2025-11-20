'use server'

import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT || 587)
const secure = process.env.SMTP_SECURE === 'true'
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS
const from = process.env.EMAIL_FROM

if (!host || !user || !pass || !from) {
  console.warn(
    '[email] SMTP credentials or EMAIL_FROM are missing. Email delivery will fail until they are configured.'
  )
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined
})

export async function sendVerificationEmail(to: string, code: string) {
  if (!host || !user || !pass || !from) {
    throw new Error('Email transport is not configured. Please set SMTP_* and EMAIL_FROM env vars.')
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>RemoDoc Verification Code</h2>
      <p>Hello,</p>
      <p>Your verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>The code expires in 15 minutes.</p>
      <p>If you did not try to create an account, you can ignore this email.</p>
      <p>— The RemoDoc Team</p>
    </div>
  `

  await transporter.sendMail({
    to,
    from,
    subject: 'Your RemoDoc verification code',
    text: `Your RemoDoc verification code is ${code}. It expires in 15 minutes.`,
    html
  })
}

