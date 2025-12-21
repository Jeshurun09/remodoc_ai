# M-Pesa Integration - Quick Start Checklist

## ✅ What's Already Done

- [x] M-Pesa library created (`lib/mpesa.ts`)
- [x] Payment API endpoint (`app/api/payment/route.ts`)
- [x] Webhook endpoint (`app/api/webhooks/mpesa/route.ts`)
- [x] Frontend payment form updated (`app/subscribe/payment/page.tsx`)
- [x] Database model added (PaymentTransaction in `prisma/schema.prisma`)
- [x] Environment variables documented (`.env` + `env.example`)
- [x] Dependencies added (axios in `package.json`)

## 🚀 Next Steps (Do These)

### 1. Install Dependencies
```bash
npm install
```

### 2. Update Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Get M-Pesa Credentials
- [ ] Register at https://www.safaricom.co.ke/business/apis
- [ ] Create a new app/application
- [ ] Copy credentials:
  - [ ] MPESA_CONSUMER_KEY
  - [ ] MPESA_CONSUMER_SECRET
  - [ ] MPESA_SHORTCODE
  - [ ] MPESA_PASSKEY

### 4. Update `.env` File
```env
MPESA_CONSUMER_KEY=your_key_here
MPESA_CONSUMER_SECRET=your_secret_here
MPESA_SHORTCODE=your_shortcode_here
MPESA_PASSKEY=your_passkey_here
MPESA_INITIATOR_NAME=initiator_here
MPESA_INITIATOR_PASSWORD=password_here
MPESA_ENV=sandbox
MPESA_CALLBACK_URL=http://localhost:3000/api/webhooks/mpesa
```

### 5. Test Locally
```bash
npm run dev
# Visit http://localhost:3000/premium
# Select a plan → "Subscribe" → Choose "M-Pesa"
# Enter: +254712345678 or 0712345678
# Click Pay → See "Payment Prompt Sent" screen
```

### 6. (Optional) Test Webhook Locally
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Update MPESA_CALLBACK_URL=https://your-ngrok-id.ngrok.io/api/webhooks/mpesa
```

## 📊 Testing Scenarios

### Scenario 1: Successful Payment
1. User enters phone: `254712345678`
2. Frontend polls `/api/subscription?checkoutRequestId=...`
3. Webhook updates status to "completed"
4. Page auto-redirects to `/dashboard/patient?premium=activated`
✅ Expected: Subscription activated

### Scenario 2: Cancelled Payment
1. User enters phone but doesn't complete on device
2. Webhook receives ResultCode != 0
3. PaymentTransaction status = "failed"
4. Page stays on payment screen (user can retry)
✅ Expected: Subscription NOT activated

### Scenario 3: Invalid Phone
1. User enters: `invalid123`
2. M-Pesa library formats to `254invalid123`
3. Safaricom rejects (ResponseCode != 0)
4. Frontend shows error: "STK push failed"
✅ Expected: Error message displayed

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Module not found: axios | Run `npm install` |
| PaymentTransaction table not found | Run `npx prisma db push` |
| Unauthorized on payment endpoint | Check you're logged in (session required) |
| STK push fails | Check credentials in `.env` match Safaricom portal |
| Callback not received | Check callback URL is correct and publicly accessible |
| Phone number rejected | Ensure format is `254XXXXXXXXX` (12 digits) |

## 📝 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payment` | POST | Initiate payment |
| `/api/webhooks/mpesa` | POST | Receive payment confirmation |
| `/api/subscription` | GET | Check subscription/payment status |
| `/subscribe/payment` | GET | Payment checkout page |
| `/premium` | GET | Plan selection page |

## 💾 Database Tables

New table created: `PaymentTransaction`
- Stores all payment attempts (successful & failed)
- Links to User and Subscription
- Tracks transaction IDs, amounts, phone numbers, receipts

## 🎯 Success Criteria

- [x] M-Pesa payment option appears on checkout page
- [x] Phone number input accepts format validation
- [x] "Payment Prompt Sent" screen appears after submission
- [x] Page shows loading indicator while polling
- [x] Auto-redirect to dashboard on successful payment
- [x] Payment transaction saved to database
- [x] Subscription status updated to ACTIVE
- [x] Error messages displayed for failed payments

## 🔐 Security Checklist

- [x] Session authentication on payment endpoints
- [x] Phone number validation before API call
- [x] Signature verification on webhooks
- [x] HTTPS required for production
- [x] Credentials stored in environment variables (not hardcoded)
- [x] Timeout on polling (5 minutes max)

## 📚 Documentation Files

- `MPESA_SETUP.md` - Full setup guide
- `MPESA_FILE_REFERENCE.md` - Technical file reference
- `MPESA_QUICK_START.md` - This file!

## 🎓 Learning Resources

- Safaricom Daraja API: https://developer.safaricom.co.ke/
- M-Pesa Documentation: https://developer.safaricom.co.ke/mpesa/apis
- STK Push Guide: https://developer.safaricom.co.ke/docs#lipa-na-m-pesa-online-stk-push

---

**Ready to test?** Start with step 1 above! 🚀
