# Student Verification System Documentation

## Overview

The student verification system allows students to verify their enrollment status and unlock access to the **STUDENT Premium Plan** at discounted rates. The system integrates with three major student verification providers:

1. **SheerID** - Email and identity verification
2. **UNiDAYS** - Student community and verification platform
3. **Student Beans** - UK student discount and verification platform

## Integration Setup

### 1. SheerID Integration

**Documentation**: https://developer.sheerid.com/docs

**Setup Steps**:

```bash
# 1. Create a SheerID developer account
# Visit: https://developer.sheerid.com

# 2. Create a new application and get your API key
# API Endpoint: https://services.sheerid.com/rest/0.5/verification/submit

# 3. Add to .env
SHEERID_API_KEY=your_api_key_here
```

**How It Works**:
- User provides first name, last name, and email
- System submits verification request to SheerID
- SheerID verifies against school databases
- Returns approval/rejection status
- Verification valid for 1 year

**API Request Example**:
```bash
curl -X POST https://services.sheerid.com/rest/0.5/verification/submit \
  -H "Authorization: Bearer YOUR_SHEERID_API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "firstName=John&lastName=Doe&email=john@university.edu&verificationTypes=STUDENT"
```

---

### 2. UNiDAYS Integration

**Documentation**: https://developers.myunidays.com/

**Setup Steps**:

```bash
# 1. Register as a partner at UNiDAYS
# Visit: https://partners.myunidays.com

# 2. Get your OAuth credentials
# OAuth Endpoint: https://api.myunidays.com/oauth/authorize

# 3. Add to .env
UNIDAYS_CLIENT_ID=your_client_id
UNIDAYS_CLIENT_SECRET=your_client_secret
```

**How It Works**:
- User redirected to UNiDAYS OAuth page
- User authenticates with their UNiDAYS account
- User grants permission for verification check
- System receives access token
- System queries student status endpoint
- Returns verification status

**API Request Example**:
```bash
curl -X GET https://api.myunidays.com/api/verify/Student/Me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**OAuth Flow**:
1. User clicks "Connect with UNiDAYS"
2. Redirected to: `https://api.myunidays.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code`
3. User authenticates and approves
4. Redirected back with authorization code
5. Exchange code for access token
6. Query verification status

---

### 3. Student Beans Integration

**Documentation**: https://studentbeans.com/partner-login

**Setup Steps**:

```bash
# 1. Create a partner account with Student Beans
# Visit: https://studentbeans.com/partner-login

# 2. Get your API key from partner dashboard
# API Endpoint: https://api.studentbeans.com/v1/verify

# 3. Add to .env
STUDENT_BEANS_API_KEY=your_api_key_here
```

**How It Works**:
- User authenticates with Student Beans account
- User grants permission for verification
- System receives access token
- System verifies student status via API
- Returns verification result

**API Request Example**:
```bash
curl -X POST https://api.studentbeans.com/v1/verify \
  -H "Authorization: Bearer YOUR_STUDENT_BEANS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "user_access_token",
    "email": "student@university.edu"
  }'
```

---

## Implementation Details

### API Endpoints

#### GET `/api/student-verification`
Get current student verification status for the authenticated user.

**Response**:
```json
{
  "verified": true,
  "provider": "SheerID",
  "expiryDate": "2027-01-19T00:00:00Z"
}
```

#### POST `/api/student-verification`
Submit student verification request.

**Request Body** (SheerID):
```json
{
  "provider": "SheerID",
  "accessToken": "token",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@university.edu"
}
```

**Request Body** (UNiDAYS):
```json
{
  "provider": "UNiDAYS",
  "accessToken": "unidays_access_token",
  "email": "john@university.edu"
}
```

**Request Body** (Student Beans):
```json
{
  "provider": "StudentBeans",
  "accessToken": "studentbeans_access_token",
  "email": "john@university.edu"
}
```

**Success Response**:
```json
{
  "success": true,
  "verified": true,
  "provider": "SheerID",
  "message": "Student verification successful! Your plan has been upgraded to STUDENT.",
  "expiryDate": "2027-01-19T00:00:00Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "verified": false,
  "message": "Student verification failed. Please check your information and try again."
}
```

#### DELETE `/api/student-verification`
Revoke student verification.

**Response**:
```json
{
  "success": true,
  "message": "Student verification revoked."
}
```

---

### Database Schema

#### User Model Extensions
```prisma
model User {
  // ... existing fields ...
  
  // Student verification fields
  studentVerified Boolean @default(false)
  studentVerificationProvider String? // SheerID, UNiDAYS, StudentBeans
  studentVerificationExpiryDate DateTime?
}
```

#### Verification Tracking
Verifications are logged in the `AILog` model for audit trail:
```json
{
  "userId": "user_id",
  "model": "student-verification",
  "prompt": "Student verified via SheerID",
  "response": {
    "verified": true,
    "provider": "SheerID",
    "email": "john@university.edu",
    "school": "University Name",
    "expiryDate": "2027-01-19T00:00:00Z"
  }
}
```

---

### User Journey

1. **Access Verification Page**
   - User navigates to `/premium/verify-student`
   - See three verification provider options
   - Current verification status displayed if already verified

2. **Choose Provider**
   - Click desired verification provider
   - Provider-specific form appears

3. **Verify with Provider**
   - **SheerID**: Enter first name, last name, email
   - **UNiDAYS**: Paste OAuth access token
   - **Student Beans**: Paste access token

4. **Success**
   - System records verification
   - User automatically upgraded to STUDENT plan
   - Subscription saved with student pricing
   - Plan valid for 1 year

5. **Renewal**
   - System checks expiry date
   - Notifications sent before expiration (optional enhancement)
   - User can re-verify to extend

---

## Features

### Automatic Plan Upgrade
- Upon successful verification, user automatically upgraded to STUDENT plan
- Student pricing rates applied ($2.99/month vs. $9.99/month for INDIVIDUAL)
- All premium features included

### Verification Expiry
- Each verification valid for 1 year from issuance
- Automatic revocation if expiry date passed
- User can re-verify to extend access

### Multiple Providers
- Users can choose preferred verification method
- Different providers suitable for different regions
- Account for regional availability differences

### Verification History
- All verification attempts logged for audit trail
- Provider name and timestamp recorded
- Failed attempts tracked for security

---

## Frontend Components

### Student Verification Page (`/premium/verify-student`)

**Key Sections**:
- Header with current status
- Provider selection cards (SheerID, UNiDAYS, Student Beans)
- Provider-specific forms
- Success/error notifications
- Info box explaining benefits

**Features**:
- Status display if already verified
- Revoke verification option
- Clear provider instructions
- External links to provider sites

### Premium Profile Enhancement
- Student verification card in sidebar
- Link to verification page
- Benefits highlighted

### Plan Comparison Page
- Note about STUDENT plan pricing
- Highlight student-specific benefits

---

## Best Practices

### 1. Error Handling
```typescript
try {
  const result = await verifyWithSheerID(token, email, firstName, lastName)
  if (result.verified) {
    await recordStudentVerification(userId, result)
  }
} catch (error) {
  // Log error and return user-friendly message
  console.error('Verification error:', error)
}
```

### 2. Token Security
- Never store provider tokens in database
- Pass tokens directly to provider APIs
- Use HTTPS for all communications
- Validate token expiry

### 3. Verification Status Checks
```typescript
// Check if verification still valid
const isValid = await isStudentVerificationValid(userId)
if (!isValid && user.studentVerified) {
  await revokeStudentVerification(userId)
}
```

### 4. Monitoring & Analytics
- Track verification success rates per provider
- Monitor failed verification attempts
- Track students with expired verifications
- Analyze provider usage patterns

---

## Troubleshooting

### Common Issues

**1. SheerID Verification Fails**
- Verify API key is correct
- Check email is school-affiliated
- Name matches school records
- No special characters in names

**2. UNiDAYS Token Invalid**
- Token may have expired
- Ensure token has correct scopes
- Re-authenticate with UNiDAYS

**3. Student Beans Connection Issues**
- API key may have expired
- Check API rate limits
- Verify server IP is whitelisted

---

## Pricing Impact

### STUDENT Plan Benefits
- **Price**: $2.99/month
- **Features**: All INDIVIDUAL features
- **Renewal**: Automatic annual verification required
- **Cancellation**: Can downgrade to FREE anytime

### Pricing Comparison
| Feature | FREE | STUDENT | INDIVIDUAL |
|---------|------|---------|-----------|
| Price | Free | $2.99/mo | $9.99/mo |
| AI Symptom Checker | ✗ | ✓ | ✓ |
| Health Records | Limited | Full | Full |
| Appointment History | ✗ | ✓ | ✓ |
| Doctor Messaging | ✗ | ✓ | ✓ |
| Advanced Analytics | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✓ | ✓ |

---

## Future Enhancements

1. **Pre-verification Lookup**
   - Search school database without full verification
   - Faster user experience

2. **Bulk Verification**
   - Schools can pre-verify student lists
   - Automatic provisioning

3. **Deep Integration**
   - OAuth providers (Google, Microsoft)
   - School/university SSO
   - Student ID camera scan

4. **Notification System**
   - Email reminders before expiry
   - Renewal prompts
   - Provider outage notifications

5. **Analytics Dashboard**
   - Verification rates by provider
   - Regional student distribution
   - Plan conversion tracking

---

## Support

For integration questions or issues:
- **SheerID Support**: https://developer.sheerid.com/docs
- **UNiDAYS Support**: https://developers.myunidays.com/support
- **Student Beans Support**: https://studentbeans.com/partner-contact
- **RemedocAI Support**: support@remodoc.com

---

**Last Updated**: January 19, 2026
**Version**: 1.0.0
