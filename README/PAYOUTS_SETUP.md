# Payout System Setup & Operations Guide

## Overview

The payout system enables doctors to receive payments from the platform based on consultations and interactions per month. Payments are processed via multiple providers (Stripe Connect, PayPal Payouts, M-Pesa B2C, Bank Transfer).

## Architecture

```
Doctor Profile → Monthly Calculation → Payout Record → Admin Review → Approval → Trigger → Provider API → Webhook → Reconciliation
```

### Components

1. **Calculation Job** (`scripts/calc_payouts.ts`)
   - Runs monthly (scheduled via GitHub Actions)
   - Groups completed appointments by doctor
   - Creates `DoctorPayout` and `DoctorPayoutItem` records
   - Status: `PENDING` → awaits admin approval

2. **Payout Runner** (`lib/payouts.ts`)
   - Dispatches payout to selected provider
   - Handles provider-specific credentials and API calls
   - Status transitions: `APPROVED` → `PROCESSING` → `PAID`/`FAILED`
   - Fallback: Safe simulation when credentials unavailable

3. **Webhook Handlers** (`app/api/webhooks/*`)
   - Stripe: `POST /api/webhooks/stripe-payouts`
   - PayPal: `POST /api/webhooks/paypal-payouts`
   - M-Pesa B2C: `POST /api/webhooks/mpesa-b2c`
   - Updates payout status from provider callbacks

4. **Admin APIs**
   - `GET /api/admin/payouts` — list with filters
   - `POST /api/admin/payouts` — create manual payout
   - `PATCH /api/admin/payouts/[id]` — approve/trigger
   - `POST /api/admin/payouts/bulk` — bulk actions
   - `GET /api/admin/payouts/export` — CSV export

5. **Doctor APIs**
   - `GET /api/doctor/payouts` — view own payout history

## Environment Setup

### Required Credentials

Add the following to `.env.local`:

```bash
# Stripe Connect
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...

# M-Pesa
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
MPESA_B2C_CONSUMER_KEY=...
MPESA_B2C_CONSUMER_SECRET=...
MPESA_B2C_SECURITY_CREDENTIAL=...
MPESA_INITIATOR_NAME=...
MPESA_WEBHOOK_SECRET=...

# Bank Transfer
BANK_API_URL=https://bank-api.example.com
BANK_API_KEY=...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### Database Schema

Run migrations to apply payout models:

```bash
npx prisma generate
npx prisma db push
```

**New Collections:**
- `DoctorPayout` — monthly payout records
- `DoctorPayoutItem` — line items per appointment
- `DoctorProfile.payouts` — relation field

## Operations

### Monthly Payout Calculation

**Automatic (GitHub Actions):**
- Runs on the 1st of each month at 00:00 UTC
- Calculates consultations from previous month
- Creates payout records with status `PENDING`

**Manual Trigger:**

```bash
npx ts-node scripts/calc_payouts.ts
```

**Parameters:**
- `--start` — period start date (default: first day of previous month)
- `--end` — period end date (default: last day of previous month)
- `--rate` — consultation rate in KES (default: 500)

### Payout Workflow

#### 1. Review Pending Payouts

```bash
curl http://localhost:3000/api/admin/payouts?status=PENDING
```

#### 2. Approve Payout

```bash
curl -X PATCH http://localhost:3000/api/admin/payouts/[ID] \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

Status: `PENDING` → `APPROVED`

#### 3. Select Provider & Trigger

```bash
curl -X PATCH http://localhost:3000/api/admin/payouts/[ID] \
  -H "Content-Type: application/json" \
  -d '{
    "action": "trigger",
    "provider": "STRIPE_CONNECT"
  }'
```

Status: `APPROVED` → `PROCESSING`

**Available Providers:**
- `STRIPE_CONNECT` — for doctors with Stripe Connect account
- `PAYPAL_PAYOUTS` — for doctors with PayPal email
- `MPESA_B2C` — for doctors with M-Pesa phone number
- `BANK_TRANSFER` — for doctors with bank account details

#### 4. Monitor Provider Status

Provider webhooks automatically update payout status when payment is processed:

- `PAID` — payment successfully sent
- `FAILED` — provider rejected payment

### Bulk Operations

#### Approve Multiple Payouts

```bash
curl -X POST http://localhost:3000/api/admin/payouts/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "payoutIds": ["id1", "id2", "id3"],
    "action": "approve"
  }'
```

#### Export to CSV

```bash
curl http://localhost:3000/api/admin/payouts/export?status=PAID \
  > payouts.csv
```

### Filtering

List payouts with advanced filters:

```bash
# By status
curl 'http://localhost:3000/api/admin/payouts?status=PROCESSING'

# By doctor
curl 'http://localhost:3000/api/admin/payouts?doctor=doctor-id'

# By provider
curl 'http://localhost:3000/api/admin/payouts?provider=STRIPE_CONNECT'

# By date range
curl 'http://localhost:3000/api/admin/payouts?startDate=2025-01-01&endDate=2025-01-31'

# Pagination
curl 'http://localhost:3000/api/admin/payouts?limit=50&skip=0'
```

## Provider Integration Details

### Stripe Connect

**Setup:**
1. Create connected account in Stripe Dashboard
2. Save `acct_...` to `DoctorProfile.stripeAccountId`
3. Set `STRIPE_SECRET_KEY` in environment

**Webhook:**
- Endpoint: `POST /api/webhooks/stripe-payouts`
- Signature verified with `STRIPE_WEBHOOK_SECRET`
- Events: `payout.paid`, `payout.updated`, `payout.failed`

### PayPal Payouts

**Setup:**
1. Create PayPal business account
2. Add PayPal email to `DoctorProfile.paypalPayoutEmail`
3. Set credentials in environment

**Webhook:**
- Endpoint: `POST /api/webhooks/paypal-payouts`
- Headers: `paypal-transmission-id`, `paypal-signature`
- Events: `PAYMENT.PAYOUTS.ITEM.SUCCEEDED`, `PAYMENT.PAYOUTS.ITEM.FAILED`

### M-Pesa B2C

**Setup:**
1. Register with Safaricom Daraja as B2C initiator
2. Add doctor's phone to `DoctorProfile.mpesaPhoneNumber`
3. Generate security credential from Safaricom console
4. Set credentials in environment

**Webhook:**
- Endpoint: `POST /api/webhooks/mpesa-b2c`
- Safaricom POSTs transaction result
- Signature verified with `MPESA_WEBHOOK_SECRET`

**Troubleshooting:**
- Security credential format: Base64-encoded encrypted password
- Ensure Daraja IP whitelisting includes webhook handler server
- Test in sandbox first

### Bank Transfer

**Setup:**
1. Define bank account fields (JSON) in `DoctorProfile.bankDetails`
2. Integrate with bank API via `BANK_API_URL` or use CSV export for manual processing
3. Save bank transfer reference to `DoctorPayout.providerReference`

**CSV Export:**

```bash
curl http://localhost:3000/api/admin/payouts/export?provider=BANK_TRANSFER > bank_transfers.csv
```

Format:
```csv
id,doctorId,doctor_name,doctor_email,amount,currency,bankDetails,status
```

## Testing

### Unit Tests

```bash
# Run integration tests
npx ts-node scripts/tests/e2e_tests.ts
```

**Coverage:**
- Payout calculation
- Filter queries
- Premium feature gating
- Webhook paths
- Doctor payout history

### Manual Testing

**Simulate payout trigger:**

```bash
curl -X PATCH http://localhost:3000/api/admin/payouts/[ID] \
  -H "Content-Type: application/json" \
  -d '{
    "action": "trigger",
    "provider": "STRIPE_CONNECT"
  }'
```

When credentials are missing, the system safely simulates the call and logs the attempt.

**Test webhook signature:**

```bash
curl -X POST http://localhost:3000/api/webhooks/mpesa-b2c \
  -H "Content-Type: application/json" \
  -H "x-mpesa-signature: test-sig" \
  -d '{
    "ConversationID": "test-conv-123",
    "Result": {
      "ResultDesc": "The service request has been processed successfully."
    }
  }'
```

## Monitoring & Troubleshooting

### Check Payout Status

```bash
curl http://localhost:3000/api/admin/payouts/[ID] | jq '.data'
```

Output:
```json
{
  "id": "...",
  "doctorId": "...",
  "status": "PROCESSING",
  "provider": "STRIPE_CONNECT",
  "providerReference": "py_1234567890",
  "amountDue": 5000,
  "currency": "KES",
  "processedAt": null,
  "items": [...]
}
```

### View Payout Items

```bash
curl http://localhost:3000/api/admin/payouts/[ID]/items | jq '.data'
```

### Doctor View Payout History

```bash
curl http://localhost:3000/api/doctor/payouts?limit=10
```

### Logs & Debugging

Check provider response in `DoctorPayout.notes`:

```bash
curl http://localhost:3000/api/admin/payouts/[ID] | jq '.data.notes'
```

## Premium Feature Gating

Use the `lib/premium` module to check subscription status:

```typescript
import { userHasPremium, getUserFeatureAccess } from '@/lib/premium'

// Check if user has any premium plan
const hasPremium = await userHasPremium(userId)

// Get feature access level
const features = await getUserFeatureAccess(userId)
if (features.advancedAnalytics) {
  // Enable advanced analytics UI
}
```

## Scheduled Jobs

### GitHub Actions Workflow

File: `.github/workflows/payouts.yml`

Triggers on:
- Schedule: 1st of month at 00:00 UTC
- Manual dispatch

Runs:
```bash
npx ts-node scripts/calc_payouts.ts --start=<prev-month-start> --end=<prev-month-end>
```

Commits results to repository.

### Local Cron Setup

To run locally with node-cron (optional):

```typescript
import cron from 'node-cron'
import { calculatePayoutsForPeriod } from './scripts/calc_payouts'

// Run at 00:00 on the 1st of each month
cron.schedule('0 0 1 * *', async () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  await calculatePayoutsForPeriod(start, end)
})
```

## Best Practices

1. **Always approve before triggering** — manual approval prevents accidental transfers
2. **Use filters for bulk operations** — verify selection before bulk approve/trigger
3. **Monitor webhooks** — ensure provider callbacks are received and reconciled
4. **Test with small amounts first** — validate provider integration before production
5. **Keep credentials secure** — never commit `.env.local` to repository
6. **Audit trail** — all approvals and triggers are logged in `DoctorPayout` records
7. **Backup bank details** — export bank transfer CSVs for finance reconciliation

## Support

For issues:
- Check webhook logs at `/api/webhooks/*/` endpoints
- Review provider-specific documentation
- Verify environment credentials are set correctly
- Run `npx ts-node scripts/tests/e2e_tests.ts` for system diagnostics

## Admin Workflow

1. Run the calculation script at the start of the month (or schedule).
2. Visit admin UI: `/dashboard/admin/payouts` to review `READY` payouts.
3. Approve payouts (button) — changes status to `APPROVED`.
4. Trigger payouts (button) — calls provider runner which sets status to `PROCESSING` and then `PAID`/`FAILED`.
5. Provider webhook should be configured to call `/api/webhooks/payouts` to reconcile statuses.

## Provider Integration Notes

- Stripe Connect: Implemented to create a `Transfer` to connected account using `destination`=connected_account_id. Requires `STRIPE_SECRET_KEY` on server.
  - Doctors must be onboarded as Stripe Connect accounts and `DoctorProfile.stripeAccountId` populated.

- PayPal Payouts: Implemented using PayPal OAuth token + Payouts API when PayPal credentials are present. Doctor must set `DoctorProfile.paypalPayoutEmail`.

- M-Pesa B2C: Placeholder in `lib/payouts.ts`. Requires Safaricom B2C credentials and integration.

- Bank Transfer: Placeholder. Needs bank API or manual process.

## Security

- Admin endpoints currently use a simple header-based guard (`x-admin-id`) as a placeholder. Replace with your auth middleware (NextAuth/session) in production.
- Doctor endpoint requires `x-user-id` or `doctorId` query param — replace with auth middleware.

## Next Steps (Recommended)

1. Implement full provider integrations and webhook verification for each provider.
2. Add robust auth/authorization (NextAuth middleware) for API endpoints and admin UI.
3. Add audit logs for payout approvals and provider responses.
4. Add CSV export and batch processing features for finance.
5. Add tests for the calculation script and payout runner.

## Troubleshooting

- If `npx ts-node scripts/calc_payouts.ts` exits with code 1:
  - Ensure `npx prisma generate` has been run and `DATABASE_URL` set in `.env`.
  - Ensure your database has appointment records with `status = COMPLETED`.

---

Last updated: December 01, 2025
