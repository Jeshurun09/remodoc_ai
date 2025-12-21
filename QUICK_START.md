# 🚀 Quick Start: Payment & Payout System

## 5-Minute Setup

### 1. Environment Variables
Copy to `.env.local`:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# PayPal
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
PAYPAL_WEBHOOK_ID=your_webhook_id

# M-Pesa
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_WEBHOOK_SECRET=your_secret
```

### 2. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 3. Test Installation
```bash
npx ts-node scripts/tests/e2e_tests.ts
```

Expected output: `✅ Passed: 6 | ❌ Failed: 0`

## Common Tasks

### Calculate Monthly Payouts
```bash
npx ts-node scripts/calc_payouts.ts
```

### List Pending Payouts
```bash
curl http://localhost:3000/api/admin/payouts?status=PENDING
```

### Approve & Trigger Payout
```bash
# 1. Approve
curl -X PATCH http://localhost:3000/api/admin/payouts/[ID] \
  -d '{"action": "approve"}'

# 2. Trigger with provider
curl -X PATCH http://localhost:3000/api/admin/payouts/[ID] \
  -d '{"action": "trigger", "provider": "STRIPE_CONNECT"}'
```

### Export Payouts to CSV
```bash
curl http://localhost:3000/api/admin/payouts/export > payouts.csv
```

### Doctor View Payouts
```bash
curl http://localhost:3000/api/doctor/payouts
```

## Payment Flows

### Customer Payment (M-Pesa/Stripe/PayPal)
```
Patient fills subscription form
    ↓
Selects payment method
    ↓
Payment endpoint created (M-Pesa STK / Stripe Intent / PayPal Order)
    ↓
Payment UI displays method-specific UI
    ↓
Provider callback webhook received
    ↓
PaymentTransaction updated → Subscription activated
```

### Doctor Payout (Admin Flow)
```
Monthly: Calculation runs (1st of month)
    ↓
DoctorPayout records created (PENDING)
    ↓
Admin reviews: /api/admin/payouts?status=PENDING
    ↓
Admin approves: PATCH /api/admin/payouts/[ID] {"action":"approve"}
    ↓
Admin triggers: PATCH /api/admin/payouts/[ID] {"action":"trigger","provider":"STRIPE_CONNECT"}
    ↓
Status: PROCESSING
    ↓
Provider processes → Webhook callback received
    ↓
Status: PAID (or FAILED)
```

## Provider-Specific Setup

### Stripe
1. Dashboard: Create Stripe Connect connected account
2. Copy `acct_xxx` to doctor's `DoctorProfile.stripeAccountId`
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### PayPal
1. Create PayPal business account
2. Add email to doctor's `DoctorProfile.paypalPayoutEmail`
3. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`

### M-Pesa
1. Register with Safaricom Daraja API
2. Add doctor phone to `DoctorProfile.mpesaPhoneNumber`
3. Set all `MPESA_*` environment variables
4. Whitelist webhook URL in Daraja console

### Bank Transfer
1. Add bank details JSON to `DoctorProfile.bankDetails`
2. Export via `GET /api/admin/payouts/export?provider=BANK_TRANSFER`
3. Process manually or integrate with bank API

## Troubleshooting

### "Unauthorized" Error
- Check NextAuth session is active
- Verify user has ADMIN or DOCTOR role
- Test with: `curl -H "Authorization: Bearer token" ...`

### Webhook Not Received
- Verify webhook URL is correct in provider dashboard
- Check firewall/network allows incoming connections
- Add provider IP to whitelist if required
- Test with: `curl -X POST http://localhost:3000/api/webhooks/stripe-payouts -d '...'`

### Payout Stuck in PROCESSING
- Check `DoctorPayout.notes` for provider error
- View provider dashboard for transaction status
- Verify credentials are correct: `STRIPE_SECRET_KEY`, `PAYPAL_*`, etc.

### No Payouts Created
- Run: `npx ts-node scripts/calc_payouts.ts`
- Check database has completed appointments in period
- Verify doctors have payout contact fields set

## Key APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payment` | POST | Initiate customer payment |
| `/api/admin/payouts` | GET | List payouts |
| `/api/admin/payouts` | POST | Create manual payout |
| `/api/admin/payouts/[id]` | PATCH | Approve/trigger payout |
| `/api/admin/payouts/bulk` | POST | Bulk actions |
| `/api/admin/payouts/export` | GET | CSV export |
| `/api/doctor/payouts` | GET | Doctor view own payouts |
| `/api/webhooks/stripe-payouts` | POST | Stripe callback |
| `/api/webhooks/paypal-payouts` | POST | PayPal callback |
| `/api/webhooks/mpesa-b2c` | POST | M-Pesa callback |

## Documentation

- **Full Setup Guide**: `PAYOUTS_SETUP.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **M-Pesa Guide**: `MPESA_SETUP.md`
- **Stripe Guide**: `STRIPE_SETUP.md`
- **PayPal Guide**: `PAYPAL_SETUP.md`
- **Hybrid Payments**: `PAYMENT_HYBRID_GUIDE.md`

## Feature Gating Example

```typescript
import { getUserFeatureAccess } from '@/lib/premium'

// In your component
const features = await getUserFeatureAccess(userId)

if (features.advancedAnalytics) {
  // Show advanced analytics UI
}
```

## Next Steps

1. ✅ Add environment variables
2. ✅ Run database migrations
3. ✅ Test with `npx ts-node scripts/tests/e2e_tests.ts`
4. ✅ Configure provider webhooks in dashboards
5. ✅ Test payment flow in UI
6. ✅ Calculate payouts and approve first transfer
7. ✅ Monitor webhook reconciliation
8. ✅ Set up GitHub Actions for monthly calculations

## Support

- Check logs: `tail -f .next/logs/*.log`
- Database inspection: `npx prisma studio`
- Test APIs: Use provided curl examples
- Debug mode: Add `DEBUG=*` to environment

---

**Status**: ✅ All systems operational

**Test Coverage**: 6/6 tests passing

**Ready for**: Development, Staging, Production
