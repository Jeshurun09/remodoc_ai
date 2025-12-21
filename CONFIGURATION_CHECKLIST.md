# ⚙️ Configuration & Setup Checklist

## Pre-Deployment Configurations

### ✅ Phase 1: Environment Variables

**Step 1: Copy template**
```bash
cp env.example .env.local
```

**Step 2: Update authentication (required)**
```bash
NEXTAUTH_URL=https://yourdomain.com  # or http://localhost:3000 for dev
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

**Step 3: Update database (already configured)**
```bash
DATABASE_URL=mongodb+srv://... # Already in env.example
```

**Step 4: Configure Stripe (for customer payments)**
```bash
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... # Get from webhook settings
```

**Step 5: Configure PayPal (for customer payments)**
```bash
# Get from: https://developer.paypal.com/dashboard
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=... # Create in webhook settings
PAYPAL_ENV=production # or sandbox for testing
```

**Step 6: Configure M-Pesa (for customer & doctor payments)**
```bash
# STK Push (customer payments)
MPESA_CONSUMER_KEY=...         # From Safaricom Daraja
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...            # Business shortcode
MPESA_PASSKEY=...              # From Daraja
MPESA_ENV=production           # or sandbox

# B2C (doctor payouts)
MPESA_B2C_CONSUMER_KEY=...     # B2C-specific credentials
MPESA_B2C_CONSUMER_SECRET=...
MPESA_B2C_SECURITY_CREDENTIAL=... # Encrypted via Daraja
MPESA_B2C_INITIATOR_NAME=...
MPESA_B2C_SHORTCODE=...
MPESA_WEBHOOK_SECRET=...       # For webhook verification
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhooks/mpesa
```

**Step 7: Configure Bank Transfer (optional, for doctor payouts)**
```bash
BANK_API_URL=https://your-bank-api.com
BANK_API_KEY=...
```

**Step 8: Configure Payout Settings**
```bash
PAYOUT_CONSULTATION_RATE=500    # KES per consultation
PAYOUT_CURRENCY=KES             # Or your currency
```

---

### ✅ Phase 2: Database Setup

**Step 1: Generate Prisma client**
```bash
npx prisma generate
```

**Step 2: Push schema to database**
```bash
npx prisma db push
```

**Expected output:**
```
✔ Generated Prisma Client (v5.18.0)
Your database is now in sync with your Prisma schema.
```

**Step 3: Verify collections created**
```bash
npx prisma studio
# Check these collections exist:
# - DoctorPayout
# - DoctorPayoutItem
# - PaymentTransaction
# - Extended DoctorProfile fields
```

---

### ✅ Phase 3: Provider Webhook Configuration

#### Stripe
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe-payouts`
3. Select events:
   - `payout.paid`
   - `payout.updated`
   - `payout.failed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

#### PayPal
1. Go to: https://developer.paypal.com/dashboard/webhooks
2. Create webhook URL: `https://yourdomain.com/api/webhooks/paypal-payouts`
3. Select event types:
   - `PAYMENT.PAYOUTS.ITEM.SUCCEEDED`
   - `PAYMENT.PAYOUTS.ITEM.FAILED`
   - `PAYMENT.PAYOUTS.ITEM.HELD`
4. Copy webhook ID → `PAYPAL_WEBHOOK_ID`

#### M-Pesa
1. Go to: https://developer.safaricom.co.ke/
2. Register webhook in Daraja console
3. Webhook URL: `https://yourdomain.com/api/webhooks/mpesa-b2c`
4. Set signing secret → `MPESA_WEBHOOK_SECRET`
5. Whitelist your domain IP (if required)

---

### ✅ Phase 4: Doctor Onboarding

**Before doctors can receive payouts, they need to set up payout contact:**

#### For Stripe Connect Payouts
1. Doctor creates Stripe Connect account
2. Save connected account ID → `DoctorProfile.stripeAccountId`

#### For PayPal Payouts
1. Doctor provides PayPal email
2. Save to `DoctorProfile.paypalPayoutEmail`

#### For M-Pesa Payouts
1. Doctor provides M-Pesa phone number
2. Save to `DoctorProfile.mpesaPhoneNumber`

#### For Bank Transfers
1. Doctor provides bank details (JSON format)
2. Save to `DoctorProfile.bankDetails`:
```json
{
  "bankName": "Kenya Commercial Bank",
  "accountName": "Dr. John Doe",
  "accountNumber": "1234567890",
  "branchCode": "001",
  "country": "KE"
}
```

**Admin endpoint to update doctor payout info:**
```bash
PATCH /api/admin/doctors/[id]/payout-info
{
  "provider": "STRIPE_CONNECT",
  "stripeAccountId": "acct_xxx"
}
```

---

### ✅ Phase 5: Testing

**Step 1: Run integration tests**
```bash
npm run payouts:test
```

**Expected output:**
```
✅ Passed: 6 | ❌ Failed: 0
```

**Step 2: Test payment flow (manual)**

For M-Pesa (development):
```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254712345678",
    "amount": 100,
    "method": "mpesa",
    "subscriptionPlan": "INDIVIDUAL"
  }'
```

For Stripe:
```bash
# Use Stripe test card: 4242 4242 4242 4242
# Visit http://localhost:3000/subscribe/payment
# Select Stripe, enter test card details
```

For PayPal:
```bash
# Use PayPal sandbox account
# Visit http://localhost:3000/subscribe/payment
# Select PayPal, login with sandbox credentials
```

**Step 3: Test payout calculation**
```bash
npm run payouts:calculate
```

**Step 4: Test webhook signatures**

M-Pesa webhook test:
```bash
curl -X POST http://localhost:3000/api/webhooks/mpesa-b2c \
  -H "Content-Type: application/json" \
  -H "x-mpesa-signature: test-sig" \
  -d '{
    "ConversationID": "test-123",
    "Result": {
      "ResultDesc": "The service request has been processed successfully."
    }
  }'
```

---

### ✅ Phase 6: GitHub Actions Setup

**File:** `.github/workflows/payouts.yml`

**Configure secrets in GitHub:**
1. Go to: Settings → Secrets and variables → Actions
2. Add secrets:
   - `DATABASE_URL`
   - `STRIPE_SECRET_KEY`
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `MPESA_B2C_CONSUMER_KEY`
   - `MPESA_B2C_CONSUMER_SECRET`
   - `MPESA_B2C_SECURITY_CREDENTIAL`

**Enable workflow:**
1. Workflow runs on: 1st of month at 00:00 UTC
2. Can be triggered manually: Actions tab → Payout Calculation → Run workflow

---

### ✅ Phase 7: API Routes Configuration

**Verify all routes are accessible:**

```bash
# Admin routes (require auth)
GET /api/admin/payouts              # List payouts
POST /api/admin/payouts             # Create manual payout
PATCH /api/admin/payouts/[id]       # Approve/trigger
POST /api/admin/payouts/bulk        # Bulk operations
GET /api/admin/payouts/export       # CSV export

# Doctor routes (require auth)
GET /api/doctor/payouts             # View own payouts

# Public routes (webhooks)
POST /api/webhooks/stripe-payouts
POST /api/webhooks/paypal-payouts
POST /api/webhooks/mpesa-b2c

# Customer payment routes
POST /api/payment                   # Initiate payment
GET /api/webhooks/mpesa             # M-Pesa callback
```

---

### ✅ Phase 8: npm Scripts Available

Add these to your deployment pipeline:

```bash
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
npm run db:generate        # Generate Prisma client
npm run db:push            # Push schema to database
npm run db:studio          # Open Prisma Studio
npm run payouts:calculate  # Calculate monthly payouts
npm run payouts:test       # Run integration tests
```

---

### ✅ Phase 9: Feature Gating Configuration

**Premium features enabled based on subscription plan:**

```typescript
// In your components:
import { getUserFeatureAccess } from '@/lib/premium'

const features = await getUserFeatureAccess(userId)

if (features.advancedAnalytics) {
  // Show advanced analytics
}

if (features.prescriptionManagement) {
  // Show prescription features
}
```

**Subscription plans:**
- `FREE` → Basic features only
- `STUDENT` → Premium features (health records, vitals)
- `INDIVIDUAL` → Premium features
- `SMALL_GROUP` → Advanced features (analytics, priority support)
- `FAMILY` → Advanced features

---

### ✅ Phase 10: Monitoring & Logging

**Add application logging for:**

```bash
# Webhook receipts
app/api/webhooks/*/route.ts → Log all incoming webhooks

# Payout status changes
lib/payouts.ts → Log payout transitions

# Provider API calls
lib/stripe.ts, lib/paypal.ts, lib/mpesa.ts → Log requests/responses

# Admin actions
app/api/admin/payouts/* → Log approvals/triggers
```

**Recommended logging:**
```typescript
console.log('[WEBHOOK] Received', { provider, type, timestamp })
console.log('[PAYOUT] Status change', { payoutId, oldStatus, newStatus })
console.log('[PROVIDER] API call', { provider, action, result })
```

---

### ✅ Phase 11: Environment-Specific Configurations

**Development (.env.local)**
```bash
NEXTAUTH_URL=http://localhost:3000
MPESA_ENV=sandbox
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_ENV=sandbox
```

**Staging (.env.staging)**
```bash
NEXTAUTH_URL=https://staging.yourdomain.com
MPESA_ENV=sandbox
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_ENV=sandbox
```

**Production (.env.production)**
```bash
NEXTAUTH_URL=https://yourdomain.com
MPESA_ENV=production
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_ENV=production
```

---

### ✅ Phase 12: Security Checklist

- [ ] `NEXTAUTH_SECRET` is secure (32+ chars, random)
- [ ] All provider credentials stored in `.env.local` (never committed)
- [ ] Webhook signatures verified in all handlers
- [ ] Admin endpoints protected by NextAuth
- [ ] Database credentials not exposed in logs
- [ ] API keys rotated periodically
- [ ] HTTPS enabled for all webhook endpoints
- [ ] Rate limiting configured for APIs
- [ ] CORS configured if frontend is separate domain
- [ ] Sensitive data not logged in production

---

### ✅ Phase 13: Deployment Checklist

**Before going to production:**

- [ ] All environment variables configured
- [ ] Database schema pushed
- [ ] Webhook endpoints tested with real providers
- [ ] Payment flow tested end-to-end
- [ ] Payout calculation tested
- [ ] Admin approval/trigger tested
- [ ] Webhook reconciliation tested
- [ ] SSL certificate installed
- [ ] Domain DNS records configured
- [ ] GitHub Actions secrets added
- [ ] Backups configured
- [ ] Monitoring/alerting setup
- [ ] Documentation reviewed
- [ ] Team trained on admin panel
- [ ] Fallback plan if webhook fails

---

### ✅ Phase 14: Post-Deployment

**First week:**
- Monitor webhook deliveries
- Check payout calculations
- Verify payment flows
- Monitor API performance
- Check error logs

**Monthly:**
- Calculate payouts (automated on 1st)
- Review payout status
- Reconcile with provider dashboards
- Check for failed transactions
- Update documentation if needed

---

## Quick Command Reference

```bash
# Setup
npx prisma generate && npx prisma db push

# Development
npm run dev

# Testing
npm run payouts:test

# Payouts
npm run payouts:calculate

# Database
npx prisma studio

# Build & Deploy
npm run build
npm run start
```

---

## Troubleshooting

**Payment not showing up:**
- Check webhook endpoint is accessible
- Verify webhook secret matches provider
- Check provider dashboard for failed deliveries
- Review API logs for errors

**Payout calculation fails:**
- Verify `DATABASE_URL` is correct
- Check Prisma schema is pushed
- Run `npx prisma generate` again
- Review script logs

**Feature gating not working:**
- Verify subscription records in database
- Check `getUserFeatureAccess` is called with correct userId
- Verify plan values match schema

**Authentication errors:**
- Verify `NEXTAUTH_SECRET` is set
- Check session cookie settings
- Verify NextAuth provider configuration

---

## Support Resources

- **Setup issues?** → `QUICK_START.md`
- **Detailed guide?** → `PAYOUTS_SETUP.md`
- **Webhook problems?** → Provider-specific guides (STRIPE_SETUP.md, etc.)
- **Code examples?** → `IMPLEMENTATION_SUMMARY.md`
- **API reference?** → `README_PAYOUTS.md`

---

**Status**: All configurations documented and ready to deploy

**Last Updated**: December 1, 2025
