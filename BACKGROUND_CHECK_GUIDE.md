# Background Check Integration Guide

## Overview

The doctor credential verification system includes background check tracking. This guide explains how to implement background checks in your workflow.

---

## What's Included

### 1. Database Model

```prisma
model DoctorVerificationRequest {
  backgroundCheckStatus    String  // NOT_REQUESTED, PENDING, APPROVED, REJECTED
  backgroundCheckReference String? // External reference ID
}
```

### 2. Admin Workflow

Admin can request background checks through the verification review interface:
```
Admin Reviews Request
    ↓
Clicks "Request Background Check"
    ↓
Enters reference number (e.g., BG_CHECK_12345)
    ↓
System stores reference and status: PENDING
    ↓
Audit log created
```

### 3. API Endpoint

```
PUT /api/admin/doctor-verifications/{id}
{
  "action": "request_background_check",
  "adminNotes": "Background check requested",
  "backgroundCheckReference": "BG_CHECK_12345"
}
```

---

## Integration Options

### Option 1: Manual Process (Recommended for Getting Started)

**How it works:**
1. Admin clicks "Request Background Check"
2. System generates reference ID (e.g., BG_CHECK_123456)
3. Admin manually contacts background check service
4. Admin updates verification request with result
5. System tracks status

**Setup Steps:**
1. No code changes needed - use as-is
2. Admin tracks background checks externally
3. Manually update status in database when complete

---

### Option 2: Third-Party API Integration (Production)

#### Common Providers

**1. Checkr (Recommended)**
```bash
npm install @checkr/api
```

Implementation:
```typescript
// app/api/admin/background-check/create/route.ts
import { CheckrClient } from '@checkr/api'

const client = new CheckrClient({
  apiKey: process.env.CHECKR_API_KEY
})

export async function POST(req: NextRequest) {
  const { doctorId, email, name } = await req.json()

  const candidate = await client.candidates.create({
    firstName: name.split(' ')[0],
    lastName: name.split(' ')[1],
    email,
    customId: doctorId
  })

  // Store reference
  await prisma.doctorVerificationRequest.update({
    where: { doctorId },
    data: {
      backgroundCheckStatus: 'PENDING',
      backgroundCheckReference: candidate.id
    }
  })

  return NextResponse.json({ candidateId: candidate.id })
}
```

**2. Jumio**
```bash
npm install @jumio/initiate
```

**3. GBG (Experian)**
```bash
npm install @gbg/web-sdk
```

---

### Option 3: Manual Webhook Handler

Create an endpoint to receive background check results:

```typescript
// app/api/webhooks/background-check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reference, status, result } = body

    // Verify webhook signature (provider-dependent)
    // if (!verifySignature(req, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Update verification request
    await prisma.doctorVerificationRequest.updateMany({
      where: { backgroundCheckReference: reference },
      data: {
        backgroundCheckStatus: status === 'CLEAR' ? 'APPROVED' : 'REJECTED',
        adminNotes: `Background check: ${result}`
      }
    })

    // Optional: Send email to admin
    // await sendBackgroundCheckResultEmail(...)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Background check webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Admin Workflow

### Requesting Background Check

1. **In Admin Dashboard:**
   - View verification request
   - Click "Request Background Check"
   - Enter notes (optional)
   - System generates reference ID
   - Status changes to PENDING

2. **Tracking:**
   - Admin maintains external tracking (spreadsheet, Jira, etc.)
   - Or integrate with third-party service

3. **Receiving Results:**
   - Results come back from service
   - Admin updates status to APPROVED or REJECTED
   - Or automatic webhook updates status

### Updating After Background Check Complete

Admin can update the status by:

**Option A: Dashboard UI (Manual)**
- Return to request
- Change status to APPROVED or REJECTED
- Add notes about check result

**Option B: API Endpoint (Programmatic)**
```bash
curl -X PUT http://localhost:3000/api/admin/doctor-verifications/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "adminNotes": "Background check cleared - approved"
  }'
```

---

## Database Schema

### Current State

```prisma
model DoctorVerificationRequest {
  id                          String   @id @default(cuid())
  doctorId                    String
  doctor                      DoctorProfile @relation(fields: [doctorId], references: [id])

  // Background Check Fields
  backgroundCheckStatus       String   @default("NOT_REQUESTED")
  // Status: NOT_REQUESTED, PENDING, APPROVED, REJECTED
  backgroundCheckReference    String?  // External service ID

  // ... other fields
}
```

### For Production Use

Consider adding additional fields:

```prisma
model DoctorVerificationRequest {
  // ... existing fields

  // Enhanced background check tracking
  backgroundCheckStatus      String   @default("NOT_REQUESTED")
  backgroundCheckReference   String?
  backgroundCheckProvider    String?  // checkr, jumio, gbg, etc.
  backgroundCheckRequestedAt DateTime?
  backgroundCheckCompletedAt DateTime?
  backgroundCheckResult      String?  // JSON with detailed results
  backgroundCheckCost        Float?   // Track costs
  backgroundCheckExpiresAt   DateTime? // Expiration date
}
```

Run migration:
```bash
npx prisma migrate dev --name add_background_check_fields
```

---

## Email Notifications (Optional)

Add email notifications when background check is requested:

```typescript
// lib/email.ts
export async function sendBackgroundCheckRequestedEmail(
  doctorName: string,
  doctorEmail: string,
  verificationId: string,
  referenceId: string
) {
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>Background Check Required</h2>
      <p>Hello ${doctorName},</p>
      <p>As part of your doctor credential verification, we require a background check.</p>
      <p>Reference ID: <strong>${referenceId}</strong></p>
      <p>Our team will handle this on your behalf. You'll receive an update within 3-5 business days.</p>
      <p>— The RemoDoc Team</p>
    </div>
  `

  await sendEmail({
    to: doctorEmail,
    subject: 'Background Check Required for Verification',
    html,
    text: `Background check requested. Reference: ${referenceId}`
  })
}
```

---

## Audit Trail

All background check actions are tracked in AuditLog:

```json
{
  "action": "REQUEST_BACKGROUND_CHECK",
  "targetType": "DoctorVerificationRequest",
  "targetId": "verification_123",
  "actorId": "admin_456",
  "details": {
    "doctorId": "doctor_789",
    "reference": "BG_CHECK_12345"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Query audit trail:
```typescript
const logs = await prisma.auditLog.findMany({
  where: {
    action: 'REQUEST_BACKGROUND_CHECK',
    targetType: 'DoctorVerificationRequest'
  },
  orderBy: { createdAt: 'desc' }
})
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Pending Background Checks**
   ```typescript
   const pending = await prisma.doctorVerificationRequest.count({
     where: { backgroundCheckStatus: 'PENDING' }
   })
   ```

2. **Average Completion Time**
   - Calculate average time from PENDING to APPROVED/REJECTED

3. **Failure Rate**
   - Track percentage of REJECTED background checks

### Alerts to Set Up

1. Background checks pending > 7 days
2. Multiple rejections from same provider
3. Missing reference IDs
4. Webhook failures

---

## Best Practices

### 1. Document Provider Requirements
```
[CHECKR]
Provider: Checkr
API Key: [stored in .env]
Time: 2-3 business days
Cost: $25-50 per check
Callback: POST /api/webhooks/background-check

[JUMIO]
Provider: Jumio
API Key: [stored in .env]
Time: 24 hours
Cost: $50-100 per check
Callback: POST /api/webhooks/jumio
```

### 2. Handle Provider Failures
```typescript
// If background check provider is down,
// allow manual override by admin
if (process.env.BACKGROUND_CHECK_PROVIDER_DOWN === 'true') {
  // Show warning in admin UI
  // Allow admin to manually approve
}
```

### 3. Expiration & Renewal
```typescript
// Background checks may expire (usually 1-3 years)
const checkExpired = (requestedAt: Date) => {
  const expirationDate = new Date(requestedAt)
  expirationDate.setFullYear(expirationDate.getFullYear() + 2)
  return new Date() > expirationDate
}
```

### 4. Cost Tracking
```typescript
// Track background check costs
const totalCost = await prisma.doctorVerificationRequest.aggregate({
  where: { backgroundCheckStatus: 'APPROVED' },
  _sum: { backgroundCheckCost: true }
})
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not received | Check provider dashboard, verify endpoint is public HTTPS |
| Reference ID not updating | Verify webhook signature, check logs |
| Background check taking too long | Check provider status, contact support |
| Cost overruns | Monitor usage, set alerts |

---

## Summary

**For Now (MVP):**
- Use manual process - no code changes needed
- Admin tracks via dashboard
- Admin approves/rejects manually

**For Production:**
- Integrate third-party provider (Checkr recommended)
- Set up webhook handlers
- Auto-update verification status
- Add monitoring and alerts

**Resources:**
- Checkr: https://checkr.com/api
- Jumio: https://jumio.com/
- GBG: https://www.gbg.com/

---

You have a solid foundation. Add third-party integration when ready! 🚀
