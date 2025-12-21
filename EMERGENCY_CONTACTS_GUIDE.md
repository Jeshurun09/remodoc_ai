# Emergency Contacts Management System

## Overview

The Emergency Contacts Management System allows patients to:
- Add multiple emergency contacts with detailed information
- Set notification preferences (Email, Phone, or Both)
- Designate a primary contact to be notified during emergencies
- Edit or delete emergency contacts at any time
- Trigger emergency alerts that notify contacts via their preferred methods

## Features

### 1. **Multiple Emergency Contacts**
- Patients can add multiple emergency contacts (parent, spouse, sibling, friend, etc.)
- Each contact can have different notification preferences
- Only one primary contact is designated at a time

### 2. **Flexible Notification Methods**
- **Phone**: Send SMS alerts via M-Pesa or other SMS providers
- **Email**: Send detailed email alerts with location information
- **Both**: Send via both phone and email simultaneously

### 3. **Contact Information**
- **Name**: Full name of the contact
- **Relationship**: Predefined relationship types (parent, spouse, sibling, friend, other)
- **Phone**: Mobile number for SMS notifications
- **Email**: Email address for email notifications
- **Verification**: Track whether contact has been verified

### 4. **Emergency Beacon Integration**
- Emergency beacon now uses the emergency contacts system
- Only patients with configured emergency contacts can trigger beacons
- Notifications are sent immediately to the primary contact

## Database Schema

### EmergencyContact Model
```prisma
model EmergencyContact {
  id              String                   @id @default(cuid()) @map("_id")
  patientId       String
  name            String
  relationship    String                   // "parent", "spouse", "sibling", "friend", "other"
  phone           String?
  email           String?
  notificationPreference NotificationPreference @default(BOTH)
  isPrimary       Boolean                  @default(false)
  verified        Boolean                  @default(false)
  verificationCode String?
  verificationExpires DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  patient PatientProfile @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([patientId, email])
  @@unique([patientId, phone])
}
```

### NotificationPreference Enum
```prisma
enum NotificationPreference {
  EMAIL
  PHONE
  BOTH
}
```

## API Endpoints

### Get All Emergency Contacts
```bash
GET /api/patient/emergency-contacts
```

**Response:**
```json
{
  "emergencyContacts": [
    {
      "id": "contact123",
      "name": "John Doe",
      "relationship": "parent",
      "phone": "+254712345678",
      "email": "john@example.com",
      "notificationPreference": "BOTH",
      "isPrimary": true,
      "verified": true,
      "createdAt": "2024-12-01T10:00:00Z",
      "updatedAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### Create Emergency Contact
```bash
POST /api/patient/emergency-contacts
Content-Type: application/json

{
  "name": "John Doe",
  "relationship": "parent",
  "phone": "+254712345678",
  "email": "john@example.com",
  "notificationPreference": "BOTH",
  "isPrimary": true
}
```

**Response (201):**
```json
{
  "message": "Emergency contact created successfully",
  "emergencyContact": { ... }
}
```

**Error Cases:**
- `400`: Missing required fields or invalid notification preference
- `404`: Patient profile not found
- `409`: Contact already exists (duplicate phone or email)

### Get Single Emergency Contact
```bash
GET /api/patient/emergency-contacts/:id
```

**Response:**
```json
{
  "emergencyContact": { ... }
}
```

**Error Cases:**
- `403`: Unauthorized (contact belongs to different patient)
- `404`: Contact not found

### Update Emergency Contact
```bash
PUT /api/patient/emergency-contacts/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "notificationPreference": "EMAIL",
  "isPrimary": false
}
```

**Response:**
```json
{
  "message": "Emergency contact updated successfully",
  "emergencyContact": { ... }
}
```

**Error Cases:**
- `403`: Unauthorized
- `404`: Contact not found
- `409`: Updated contact conflicts with existing contact

### Delete Emergency Contact
```bash
DELETE /api/patient/emergency-contacts/:id
```

**Response:**
```json
{
  "message": "Emergency contact deleted successfully"
}
```

**Error Cases:**
- `403`: Unauthorized
- `404`: Contact not found

## Emergency Beacon Integration

### Updated Emergency Beacon Flow

When a patient triggers an emergency beacon:

1. **System checks** if primary emergency contact exists
   - If not, shows error: "Please add an emergency contact first"

2. **System retrieves** primary contact information
   - Phone number (if applicable)
   - Email address (if applicable)
   - Notification preference

3. **System sends** notifications based on preference:
   - **PHONE**: SMS alert via `sendEmergencySMS()`
   - **EMAIL**: Email alert via `sendEmail()` with formatted HTML
   - **BOTH**: Sends via both channels simultaneously

4. **System returns** response with notification status:
   ```json
   {
     "success": true,
     "message": "Emergency beacon sent successfully",
     "notifications": {
       "sms_sent": true,
       "email_sent": true,
       "errors": []
     }
   }
   ```

### Emergency Email Template

```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
    <h1>🚨 EMERGENCY ALERT</h1>
  </div>
  <div style="padding: 20px; background-color: #f9fafb;">
    <p><strong>{PATIENT_NAME}</strong> has triggered an emergency beacon and needs immediate assistance.</p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0;">
      <p><strong>Message:</strong> {MESSAGE}</p>
    </div>
    <p><strong>📍 Location:</strong> <a href="https://maps.google.com/?q={LAT},{LNG}">View on Maps</a></p>
    <p style="font-size: 12px; color: #999;">Time: {TIMESTAMP}</p>
  </div>
</div>
```

## React Component: EmergencyContactsManager

### Usage
```tsx
import EmergencyContactsManager from '@/components/patient/EmergencyContactsManager'

export default function Settings() {
  return (
    <EmergencyContactsManager isDark={false} />
  )
}
```

### Props
- `isDark?: boolean` - Enable dark mode styling (default: false)

### Features
- Add new emergency contact
- Edit existing contact
- Delete contact
- Set primary contact
- View all contacts with details
- Real-time validation
- Error/success messaging

### States
- **Empty state**: Shows placeholder when no contacts exist
- **Loading**: Shows loading message while fetching
- **Form mode**: Displays form to add/edit contact
- **View mode**: Lists all contacts with action buttons

## Setup Instructions

### 1. Database Migration
```bash
npx prisma db push
```

This creates the `EmergencyContact` collection with:
- Unique index on `(patientId, email)`
- Unique index on `(patientId, phone)`

### 2. Add to Patient Dashboard
The component is already integrated in `/app/dashboard/patient/page.tsx`:
- New "🚨 Emergency Contacts" tab
- Accessible to all authenticated patients
- No premium requirement

### 3. Configure Email Sending
Ensure `lib/email.ts` has the `sendEmail()` function:
```typescript
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
}) {
  // Implementation using your email provider
}
```

### 4. Configure SMS Sending
Ensure `lib/sms.ts` has the `sendEmergencySMS()` function:
```typescript
export async function sendEmergencySMS(
  phone: string,
  message: string,
  location?: { lat: number; lng: number }
) {
  // Implementation using your SMS provider
}
```

## Usage Flow

### For Patients

1. **Navigate to Dashboard**
   - Go to Patient Dashboard
   - Click "🚨 Emergency Contacts" tab

2. **Add Emergency Contact**
   - Click "Add Contact" button
   - Fill in contact details:
     - Name (required)
     - Relationship (required)
     - Phone or Email (at least one required)
     - Notification preference (Email, Phone, or Both)
     - Mark as primary (optional)
   - Click "Add Contact"

3. **Set Primary Contact**
   - Click "Edit" on any contact
   - Check "Make Primary Contact"
   - Click "Update Contact"
   - System automatically unsets other primary contacts

4. **Trigger Emergency Beacon**
   - Ensure at least one contact is added
   - Click "🚨 Emergency" button (fixed position on page)
   - Confirm action
   - System sends alert to primary contact via selected method

5. **Manage Contacts**
   - **Edit**: Click pencil icon to modify contact details
   - **Delete**: Click trash icon and confirm deletion
   - **Update**: Make changes and click "Update Contact"

## Technical Details

### Contact Uniqueness
- Each patient can only have one contact per email address
- Each patient can only have one contact per phone number
- Prevents duplicate notifications to same number/email

### Primary Contact Management
- Only one primary contact per patient
- When setting a contact as primary, system automatically unsets others
- Primary contact receives all emergency notifications

### Notification Workflow
```
Patient triggers emergency
    ↓
System fetches primary contact
    ↓
Check notification preference
    ↓
├─ PHONE: Send SMS + return result
├─ EMAIL: Send email + return result
└─ BOTH: Send SMS + email in parallel
    ↓
Combine results and return to frontend
```

### Error Handling
- Graceful fallback if SMS fails but email succeeds (or vice versa)
- Clear error messages to user
- Detailed error logging for debugging

## Security Considerations

1. **Authorization**
   - All endpoints require authentication (NextAuth session)
   - Patients can only access their own emergency contacts
   - Ownership verified on GET, PUT, DELETE operations

2. **Data Validation**
   - Email format validation
   - Phone number format requirements (customizable)
   - Required field validation

3. **Unique Constraints**
   - Database enforces unique `(patientId, email)` pairs
   - Database enforces unique `(patientId, phone)` pairs
   - Prevents duplicate contact alerts

4. **Cascade Delete**
   - Emergency contacts deleted when patient profile is deleted
   - `onDelete: Cascade` prevents orphaned records

## Testing

### Manual Testing Checklist
- [ ] Add new emergency contact with valid data
- [ ] Add contact with phone only
- [ ] Add contact with email only
- [ ] Add contact with both phone and email
- [ ] Set contact as primary
- [ ] Verify only one primary contact at a time
- [ ] Edit contact details
- [ ] Delete contact with confirmation
- [ ] View all contacts
- [ ] Trigger emergency beacon with configured contact
- [ ] Verify notifications sent to correct channel(s)
- [ ] Test error cases (missing required fields, duplicate contact)

### API Testing
```bash
# Create contact
curl -X POST http://localhost:3000/api/patient/emergency-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "relationship": "parent",
    "phone": "+254712345678",
    "email": "john@example.com",
    "notificationPreference": "BOTH",
    "isPrimary": true
  }'

# Get all contacts
curl http://localhost:3000/api/patient/emergency-contacts

# Update contact
curl -X PUT http://localhost:3000/api/patient/emergency-contacts/:id \
  -H "Content-Type: application/json" \
  -d '{"notificationPreference": "EMAIL"}'

# Delete contact
curl -X DELETE http://localhost:3000/api/patient/emergency-contacts/:id
```

## Future Enhancements

1. **Verification Flow**
   - Send verification code to phone/email
   - Confirm contact availability before emergencies
   - Track verification status

2. **Contact Templates**
   - Quick-add templates for common relationships
   - Pre-filled forms for family members

3. **Notification History**
   - Track all emergency notifications sent
   - View delivery status and timestamps
   - Retry failed notifications

4. **Advanced Scheduling**
   - Different primary contacts based on time of day
   - Escalation workflow (try 1st contact, then 2nd if no response)
   - Scheduled notification reminders

5. **Integration Logging**
   - Detailed logs of notification attempts
   - Success/failure reasons
   - Provider-specific details

## Troubleshooting

### Issue: "No emergency contact configured"
**Solution**: Add an emergency contact in the Emergency Contacts tab before triggering beacon

### Issue: SMS/Email not sent
**Solution**: 
1. Verify provider credentials in `.env`
2. Check contact has phone/email matching notification preference
3. Review SMS/email provider logs
4. Check network connectivity

### Issue: Duplicate contact error
**Solution**: 
- Each patient can only have one contact per email/phone
- Delete the existing contact if you need to update the number/email
- Or use edit to modify details for existing contact

### Issue: Primary contact not updating
**Solution**:
1. Refresh the page to see latest state
2. Verify only one contact has `isPrimary: true`
3. Clear browser cache if needed

## Related Documentation
- [Emergency Beacon System](./EMERGENCY_BEACON.md)
- [Patient Dashboard Guide](./PATIENT_DASHBOARD.md)
- [SMS Integration](./SMS_SETUP.md)
- [Email Integration](./EMAIL_SETUP.md)
