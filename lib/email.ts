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

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  if (!host || !user || !pass || !from) {
    console.warn('[email] Email transport not configured. Message not sent to:', options.to)
    return
  }

  await transporter.sendMail({
    to: options.to,
    from,
    subject: options.subject,
    text: options.text || 'Please view this email in HTML mode.',
    html: options.html
  })
}

export async function sendDoctorVerificationSubmittedEmail(doctorName: string, doctorEmail: string, verificationId: string) {
  if (!host || !user || !pass || !from) {
    console.warn('[email] Email not sent - doctor verification submitted notification not configured')
    return
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>Doctor Credential Verification Submitted</h2>
      <p>Hello ${doctorName},</p>
      <p>We have received your doctor credential verification submission. Our admin team will review your documents and verify your credentials.</p>
      <p><strong>What happens next:</strong></p>
      <ul>
        <li>Admin team reviews your submitted documents (typically within 24-48 hours)</li>
        <li>We may request additional information or background checks</li>
        <li>You will receive an email once your verification is approved or rejected</li>
      </ul>
      <p><strong>Verification ID:</strong> ${verificationId}</p>
      <p>Thank you for joining RemoDoc!</p>
      <p>— The RemoDoc Team</p>
    </div>
  `

  await transporter.sendMail({
    to: doctorEmail,
    from,
    subject: 'Doctor Credential Verification Received',
    text: `Your doctor credential verification has been submitted and is under review. Verification ID: ${verificationId}`,
    html
  })
}

export async function sendDoctorVerificationApprovedEmail(doctorName: string, doctorEmail: string, verificationId: string) {
  if (!host || !user || !pass || !from) {
    console.warn('[email] Email not sent - doctor verification approved notification not configured')
    return
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>✅ Doctor Credential Verification Approved</h2>
      <p>Hello ${doctorName},</p>
      <p>Congratulations! Your doctor credential verification has been <strong>APPROVED</strong> by our admin team.</p>
      <p>You now have full access to RemoDoc's doctor features including:</p>
      <ul>
        <li>Schedule consultations with patients</li>
        <li>View and manage appointments</li>
        <li>Update prescriptions and medical records</li>
        <li>Access patient telemedicine</li>
        <li>Receive earnings from consultations</li>
      </ul>
      <p><strong>Verification ID:</strong> ${verificationId}</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Welcome to RemoDoc!</p>
      <p>— The RemoDoc Team</p>
    </div>
  `

  await transporter.sendMail({
    to: doctorEmail,
    from,
    subject: '✅ Your Doctor Verification Has Been Approved',
    text: `Your doctor credential verification has been approved! You now have access to all doctor features.`,
    html
  })
}

export async function sendDoctorVerificationRejectedEmail(doctorName: string, doctorEmail: string, verificationId: string, reason: string) {
  if (!host || !user || !pass || !from) {
    console.warn('[email] Email not sent - doctor verification rejected notification not configured')
    return
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>Doctor Credential Verification - Not Approved</h2>
      <p>Hello ${doctorName},</p>
      <p>Thank you for submitting your doctor credential verification. Unfortunately, your verification request has been <strong>rejected</strong> at this time.</p>
      <p><strong>Reason:</strong></p>
      <p>${reason}</p>
      <p><strong>What you can do:</strong></p>
      <ul>
        <li>Review the reason provided above carefully</li>
        <li>Gather any missing or corrected documents</li>
        <li>Resubmit your verification with updated information</li>
        <li>Contact support if you need clarification</li>
      </ul>
      <p><strong>Verification ID:</strong> ${verificationId}</p>
      <p>We look forward to reviewing your resubmission soon!</p>
      <p>— The RemoDoc Team</p>
    </div>
  `

  await transporter.sendMail({
    to: doctorEmail,
    from,
    subject: 'Doctor Verification Request - Additional Information Needed',
    text: `Your doctor credential verification request requires attention. Reason: ${reason}`,
    html
  })
}

export async function sendAdminDoctorVerificationSubmittedEmail(adminEmail: string, doctorName: string, doctorEmail: string, verificationId: string, dashboardLink: string) {
  if (!host || !user || !pass || !from) {
    console.warn('[email] Email not sent - admin notification for doctor verification not configured')
    return
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>📋 New Doctor Credential Verification Submitted</h2>
      <p>Hello Admin,</p>
      <p>A new doctor credential verification request has been submitted and requires your review.</p>
      <p><strong>Doctor Details:</strong></p>
      <ul>
        <li>Name: ${doctorName}</li>
        <li>Email: ${doctorEmail}</li>
        <li>Verification ID: ${verificationId}</li>
      </ul>
      <p><strong>Action Required:</strong></p>
      <p>Please review the submitted documents and verify the doctor's credentials.</p>
      <p>
        <a href="${dashboardLink}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;
        border-radius:6px;text-decoration:none;font-weight:bold;">View in Admin Dashboard</a>
      </p>
      <p>— The RemoDoc System</p>
    </div>
  `

  await transporter.sendMail({
    to: adminEmail,
    from,
    subject: `[Admin] New Doctor Verification: ${doctorName}`,
    text: `New doctor verification submitted by ${doctorName}. Verification ID: ${verificationId}`,
    html
  })
}


