'use server'

import nodemailer from 'nodemailer'

const host = process.env.EMAIL_HOST
const port = Number(process.env.EMAIL_PORT || 587)
const secure = process.env.EMAIL_SECURE === 'true'
const user = process.env.EMAIL_USER
const pass = process.env.EMAIL_PASS
const from = process.env.EMAIL_FROM

if (!host || !user || !pass || !from) {
  console.warn(
    '[email] EMAIL_* credentials are missing. Email delivery will fail until EMAIL_HOST/EMAIL_USER/EMAIL_PASS/EMAIL_FROM are configured.'
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
    throw new Error('Email transport is not configured. Please set EMAIL_HOST/EMAIL_USER/EMAIL_PASS/EMAIL_FROM env vars.')
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

export async function sendInviteEmail(to: string, inviteLink: string, role: string) {
  if (!host || !user || !pass || !from) {
    throw new Error('Email transport is not configured. Please set EMAIL_HOST/EMAIL_USER/EMAIL_PASS/EMAIL_FROM env vars.')
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>RemoDoc ${role} Invitation</h2>
      <p>Hello,</p>
      <p>You have been invited to join RemoDoc as a <strong>${role.toLowerCase()}</strong>.</p>
      <p>Click the button below to accept the invitation and set your password:</p>
      <p>
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;
        border-radius:6px;text-decoration:none;font-weight:bold;">Accept Invitation</a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;">${inviteLink}</p>
      <p>This link will expire in 48 hours.</p>
      <p>If you were not expecting this email, you can safely ignore it.</p>
      <p>— The RemoDoc Team</p>
    </div>
  `

  await transporter.sendMail({
    to,
    from,
    subject: 'You have been invited to RemoDoc',
    text: `You have been invited to join RemoDoc as a ${role}. Open the following link to accept: ${inviteLink}`,
    html
  })
}

