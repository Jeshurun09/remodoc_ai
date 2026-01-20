# Premium Plan Switching & Group Management

## Overview

The premium system now supports:
1. **Plan Switching** - Users can upgrade or downgrade their subscription plans at any time
2. **Group Subscriptions** - Group/family plans with a designated moderator who controls access
3. **Feature Access Control** - Moderators can restrict specific features for group members

## API Endpoints

### Plan Switching

**GET `/api/subscription/change-plan`**
Get available plans for the current user.

```bash
curl -X GET http://localhost:3000/api/subscription/change-plan
```

Response:
```json
{
  "currentPlan": "INDIVIDUAL",
  "availablePlans": ["FREE", "STUDENT", "SMALL_GROUP", "FAMILY"],
  "canUpgrade": true,
  "canDowngrade": true
}
```

**POST `/api/subscription/change-plan`**
Change to a new plan with optional proration.

```bash
curl -X POST http://localhost:3000/api/subscription/change-plan \
  -H "Content-Type: application/json" \
  -d '{
    "newPlan": "FAMILY",
    "prorationPolicy": "charge_difference"
  }'
```

Request body:
- `newPlan` (required): One of FREE, STUDENT, INDIVIDUAL, SMALL_GROUP, FAMILY
- `prorationPolicy` (optional): "charge_difference" | "full_refund" | "no_proration"

Response:
```json
{
  "success": true,
  "subscription": {
    "id": "...",
    "plan": "FAMILY",
    "status": "ACTIVE"
  },
  "proratedAmount": 1500,
  "message": "Plan changed from INDIVIDUAL to FAMILY. Additional charge: KES 15.00"
}
```

### Group Subscriptions

**POST `/api/subscription/group`**
Create a new group subscription (moderator only).

```bash
curl -X POST http://localhost:3000/api/subscription/group \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "plan": "FAMILY",
    "maxMembers": 5
  }'
```

Request body:
- `action`: "create" | "add-member" | "remove-member"
- `plan` (for create): SMALL_GROUP | FAMILY
- `maxMembers` (for create): 1-10 (default: 5)
- `groupId` (for add/remove): ID of the group
- `memberId` (for add/remove): User email or ID

Response:
```json
{
  "success": true,
  "group": {
    "id": "...",
    "plan": "FAMILY",
    "maxMembers": 5,
    "status": "TRIAL"
  }
}
```

**GET `/api/subscription/group`**
Get group subscription details and members.

```bash
curl -X GET http://localhost:3000/api/subscription/group
```

Response:
```json
{
  "group": {
    "id": "...",
    "plan": "FAMILY",
    "maxMembers": 5,
    "memberCount": 3,
    "isModerator": true,
    "members": [
      {
        "id": "...",
        "userId": "...",
        "email": "member@example.com",
        "isModerated": false
      }
    ],
    "features": []
  }
}
```

**Add Member to Group**

```bash
curl -X POST http://localhost:3000/api/subscription/group \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add-member",
    "groupId": "group-id",
    "memberId": "member@example.com"
  }'
```

**Remove Member from Group**

```bash
curl -X POST http://localhost:3000/api/subscription/group \
  -H "Content-Type: application/json" \
  -d '{
    "action": "remove-member",
    "groupId": "group-id",
    "memberId": "member-user-id"
  }'
```

### Feature Access Control

**POST `/api/subscription/group-features`**
Set feature access restrictions for a group member (moderator only).

```bash
curl -X POST http://localhost:3000/api/subscription/group-features \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group-id",
    "memberId": "member-user-id",
    "features": [
      { "name": "advancedAnalytics", "allowed": false },
      { "name": "prescriptionManagement", "allowed": true }
    ]
  }'
```

Request body:
- `groupId` (required): Group subscription ID
- `memberId` (required): Member user ID
- `features` (required): Array of feature objects with `name` and `allowed` boolean

Response:
```json
{
  "success": true,
  "features": [
    {
      "id": "...",
      "groupId": "...",
      "memberId": "...",
      "featureName": "advancedAnalytics",
      "allowed": false
    }
  ]
}
```

**GET `/api/subscription/group-features`**
Get feature access for a group member.

```bash
curl -X GET "http://localhost:3000/api/subscription/group-features?groupId=group-id&memberId=member-id"
```

Response:
```json
{
  "memberId": "...",
  "groupId": "...",
  "features": {
    "aiSymptomChecker": true,
    "appointmentBooking": true,
    "messaging": true,
    "healthRecordStorage": true,
    "vitalsTracking": true,
    "advancedAnalytics": false,
    "prioritySupport": true
  },
  "customRestrictions": [
    {
      "featureName": "advancedAnalytics",
      "allowed": false
    }
  ]
}
```

## Using Premium Functions

### Check Plan

```typescript
import { userHasPlan } from '@/lib/premium'
import { SubscriptionPlan } from '@prisma/client'

// Check if user has at least INDIVIDUAL plan
const hasIndividual = await userHasPlan(userId, SubscriptionPlan.INDIVIDUAL)
```

### Check Group Moderator Status

```typescript
import { isGroupModerator, getGroupMembers } from '@/lib/premium'

const isMod = await isGroupModerator(userId)
if (isMod) {
  const members = await getGroupMembers(userId)
}
```

### Check Feature Access

```typescript
import { userHasFeatureAccess } from '@/lib/premium'

// Check if user can access advanced analytics
const hasAccess = await userHasFeatureAccess(userId, 'advancedAnalytics')
if (!hasAccess) {
  // Show upgrade prompt
}
```

### Get Full Feature Access

```typescript
import { getUserFeatureAccess } from '@/lib/premium'

const features = await getUserFeatureAccess(userId)
// Returns: {
//   aiSymptomChecker: true,
//   appointmentBooking: true,
//   messaging: true,
//   ...
// }
```

### Get Plan Change History

```typescript
import { getPlanChangeHistory } from '@/lib/premium'

const history = await getPlanChangeHistory(userId)
// Returns: [{
//   timestamp: Date,
//   details: { fromPlan, toPlan, proratedAmount, timestamp }
// }]
```

## Plan Hierarchy

```
FREE (0)
  ↓
STUDENT (1)
  ↓
INDIVIDUAL (2)
  ↓
SMALL_GROUP (3)
  ↓
FAMILY (4)
```

## Features by Plan

### FREE
- AI Symptom Checker
- Appointment Booking
- Messaging
- Emergency Alerts

### STUDENT
- All FREE features
- Health Record Storage
- Vitals Tracking
- Appointment History

### INDIVIDUAL
- All STUDENT features

### SMALL_GROUP
- All features above
- Advanced Analytics
- Priority Support
- Prescription Management
- Lifestyle Tracking
- Family Sharing

### FAMILY
- All SMALL_GROUP features
- Extended family support (up to 5 members)

## Default Pricing (KES)

- STUDENT: 29.99
- INDIVIDUAL: 99.99
- SMALL_GROUP: 199.99
- FAMILY: 299.99

## Database Schema

### Subscription
- `groupId`: Links to group subscription (for group members)
- `isGroupModerator`: Boolean flag for group moderators

### GroupSubscription
- `moderatorId`: User who pays and manages the group
- `maxMembers`: Maximum group members allowed
- `members`: Array of group member subscriptions
- `features`: Custom feature access controls

### GroupFeatureAccess
- `groupId`: Associated group
- `memberId`: Member user ID
- `featureName`: Feature name to restrict
- `allowed`: Whether feature is allowed for this member
