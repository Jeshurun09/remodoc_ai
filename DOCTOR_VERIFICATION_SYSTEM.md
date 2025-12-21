# Doctor Credential Verification System - Complete Guide

## Overview

This is a comprehensive doctor credential verification system allowing doctors to submit credentials, undergo admin review, and receive verification approval with full audit trail tracking.

## Features

### 1. Doctor Credential Submission
Doctors can submit 13 different credential types via `/api/doctor/verification` POST endpoint:
- Full Legal Name
- National ID
- Medical Registration Number
- Registration Status Document URL
- Medical License URL
- Medical Degree URL
- Internship Letter URL
- Postgraduate Certificate URL
- Facility Name
- Facility Address
- Facility Official Email
- Passport Photo URL
- Signed Oath URL

**Input Validation:**
- All required fields validated for type and format
- National IDs checked against heuristic (6-20 alphanumeric)
- Emails validated with regex pattern
- URLs must be http(s) and valid URL format
- All text fields sanitized to remove HTML special characters

**Submission Flow:**
1. Doctor fills DoctorProfileEditor form
2. Files uploaded to `/api/uploads` (base64) or `/api/uploads/s3-presign` (production)
3. Document URLs stored with verification request
4. Status set to PENDING
5. Admin notified for review

### 2. OTP Phone Verification
Two-step SMS verification for phone numbers:

**Step 1: Send OTP**
```
POST /api/doctor/verification/send-otp
{
  "phoneNumber": "+1234567890"
}
```
- Generates 6-digit OTP
- Sends via Twilio SMS
- Stores in PhoneOtp table with 10-minute expiration

**Step 2: Verify OTP**
```
POST /api/doctor/verification/verify-otp
{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```
- Validates code and expiration
- Sets `phoneVerified: true` on verification request
- Deletes used OTP

### 3. Admin Review Workflow

**Admin Actions Available:**

#### Approve Verification
```
PUT /api/admin/doctor-verifications/{id}
{
  "action": "approve",
  "adminNotes": "All documents verified and authentic"
}
```
- Updates verification status to APPROVED
- Sets doctor verification status to VERIFIED
- Creates audit log entry
- Updates verification timestamps

#### Reject Verification
```
PUT /api/admin/doctor-verifications/{id}
{
  "action": "reject",
  "adminNotes": "Documents do not match credentials system"
}
```
- Updates status to REJECTED
- Stores rejection reason in admin notes
- Creates audit log entry

#### Request Background Check
```
PUT /api/admin/doctor-verifications/{id}
{
  "action": "request_background_check",
  "adminNotes": "Requesting third-party background check",
  "backgroundCheckReference": "BG_CHECK_123456"
}
```
- Sets background check status to PENDING
- Stores reference for tracking
- Creates audit log entry

### 4. File Upload Strategy

**Development Mode** (Always Available):
```
POST /api/uploads
{
  "fileName": "license.pdf",
  "contentBase64": "JVBERi0xLjQKJ..."
}
```
- Stores files in `public/uploads/` directory
- Returns URL like `/uploads/timestamp-random/filename`
- No AWS credentials required

**Production Mode** (Optional):
```
POST /api/uploads/s3-presign
{
  "fileName": "license.pdf",
  "contentType": "application/pdf"
}
```
- Requires AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET)
- Returns presigned PUT URL valid for 1 hour
- Client uploads directly to S3 bucket
- Falls back to dev mode if S3 not configured (returns 501)

### 5. Audit Logging

Every admin action creates an AuditLog entry:
```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actorId     String   // Admin user ID
  action      String   // APPROVE_VERIFICATION, REJECT_VERIFICATION, REQUEST_BACKGROUND_CHECK
  targetType  String   // DoctorVerificationRequest
  targetId    String   // ID of verification request
  details     String   // JSON stringified details (doctorId, reason, reference, etc)
  createdAt   DateTime @default(now())
}
```

**Queryable by:**
- Actor (who made the action)
- Target (which verification was affected)
- Date range

## Database Schema

### DoctorVerificationRequest Model
- All 13 credential fields stored as URLs or strings
- `status`: PENDING | UNDER_REVIEW | APPROVED | REJECTED
- `backgroundCheckStatus`: NOT_REQUESTED | PENDING | APPROVED | REJECTED
- `phoneVerified`: boolean
- Admin review fields: `reviewedBy`, `reviewedAt`, `adminNotes`
- Background check fields: `backgroundCheckStatus`, `backgroundCheckReference`

### PhoneOtp Model
- Temporary storage for OTP codes
- Includes expiration timestamp (10 minutes)
- Automatically cleaned up after verification or expiration

### AuditLog Model
- Immutable record of all admin actions
- Includes actor ID, action type, target type/ID, and JSON details
- Indexed for efficient querying

## API Endpoints Summary

### Doctor Endpoints
- `GET /api/doctor/verification` - List own verification requests
- `POST /api/doctor/verification` - Submit new verification request
- `POST /api/doctor/verification/send-otp` - Request OTP for phone
- `POST /api/doctor/verification/verify-otp` - Verify phone with OTP
- `POST /api/uploads` - Upload file (base64)

### Admin Endpoints
- `GET /api/admin/doctor-verifications` - List all requests (filterable by status)
- `GET /api/admin/doctor-verifications/{id}` - View single request
- `PUT /api/admin/doctor-verifications/{id}` - Approve/reject/request background check

### Upload Endpoints
- `POST /api/uploads` - Dev file upload
- `POST /api/uploads/s3-presign` - Production S3 presigned URL

## Frontend Components

### DoctorProfileEditor
Located at `components/doctor/DoctorProfileEditor.tsx`
- Form fields for all 13 credential types
- File upload with base64 conversion
- OTP send/verify flow
- Status display and error handling
- Prefills from existing verification requests

**Usage:**
```tsx
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'

export default function Dashboard() {
  return <DoctorProfileEditor />
}
```

### DoctorVerificationReview
Located at `components/admin/DoctorVerificationReview.tsx`
- Lists verification requests with filtering
- Shows verification details and status
- Approve/reject/background-check actions
- Admin notes textarea
- Real-time audit trail integration

**Usage:**
```tsx
import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'

export default function AdminPanel() {
  return <DoctorVerificationReview filter="PENDING" />
}
```

## Validation Rules

### Server-Side Validation (Required)
All inputs validated on both client and server:
- National ID: 6-20 alphanumeric characters
- Email: Standard email format with regex
- URLs: Must be http(s) protocol and valid URL
- Required fields: Cannot be empty after trimming
- HTML sanitization: Removes `&<>"` characters

### Security Measures
- All admin actions require admin role check
- All doctor actions require session authentication
- Sensitive data sanitized before storage
- OTP codes expire after 10 minutes
- SMS delivery failures logged (not exposed to user)

## Testing

**Unit Tests (4 tests):**
```
tests/validators.test.ts
- isValidEmail validation
- isValidUrl validation
- isLikelyNationalId heuristic
- sanitizeShort HTML removal
```

**Integration Tests (21 tests):**
```
tests/verification-endpoints.test.ts
- Doctor submission validation
- OTP generation and verification
- Admin action types
- File upload validation
- Audit logging
- Data integrity
- Error handling
```

**Run Tests:**
```bash
npm run test          # Watch mode
npm run test -- --run # Single run
```

## Environment Variables

For S3 production upload mode:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=us-east-1  # Optional, defaults to us-east-1
```

For SMS/OTP:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Workflow Example

1. **Doctor submits credentials:**
   - Fills DoctorProfileEditor form
   - Uploads files via `/api/uploads`
   - Submits to `/api/doctor/verification`
   - Status: PENDING

2. **Doctor verifies phone:**
   - Calls `/api/doctor/verification/send-otp`
   - Receives SMS with 6-digit code
   - Enters code in UI
   - Calls `/api/doctor/verification/verify-otp`
   - Marked as `phoneVerified: true`

3. **Admin reviews:**
   - Views pending requests via DoctorVerificationReview
   - Clicks "Review & Take Action"
   - Approves or rejects with notes
   - System creates AuditLog entry
   - Doctor's verification status updated

4. **Background check (optional):**
   - Admin can request background check
   - System sets `backgroundCheckStatus: PENDING`
   - Reference stored for tracking
   - Can approve after check completion

## Known Limitations

1. Background check integration not yet implemented (manual flow)
2. SMS delivery requires valid Twilio credentials (graceful fallback in place)
3. S3 upload requires AWS credentials (dev fallback always works)
4. Currently no email notification to doctor on approval/rejection

## Future Enhancements

1. Integrate third-party background check API
2. Add email notifications to doctors
3. Implement document OCR for automated verification
4. Add bulk rejection capability
5. Create verification timeline/history view
6. Add verification status webhook notifications
7. Implement verification request templates
8. Add analytics dashboard for verification metrics
