# M-Pesa Payment Integration Setup Guide

## Overview
RemoDoc now supports M-Pesa payments for premium subscriptions! This guide walks you through setting up M-Pesa integration with Safaricom's Daraja API.

## What's Been Implemented

### Backend
- ✅ **M-Pesa Library** (`lib/mpesa.ts`): Complete Safaricom Daraja API integration
  - OAuth token generation
  - STK Push initiation (sends payment prompt to user's phone)
  - STK status querying
  - Callback signature verification
  
- ✅ **Payment Endpoint** (`app/api/payment/route.ts`): Handles M-Pesa requests
  - Validates phone numbers
  - Creates PaymentTransaction records
  - Returns checkout request ID for frontend polling
  
- ✅ **Webhook Endpoint** (`app/api/webhooks/mpesa/route.ts`): Receives payment confirmations
  - Receives async callbacks from Safaricom
  - Updates payment status and subscription
  - Activates premium plan on success
  
- ✅ **Database**: Added `PaymentTransaction` model to track all payments
  - Stores transaction IDs, amounts, phone numbers
  - Full audit trail for compliance

### Frontend
- ✅ **Payment Form** (`app/subscribe/payment/page.tsx`): M-Pesa UI
  - Phone number input field
  - "Payment Prompt Sent" waiting screen
  - Auto-polling every 3 seconds for payment confirmation
  - Auto-redirect to dashboard on success

## Setup Instructions

### Step 1: Get Safaricom M-Pesa Credentials

You need to register with Safaricom to get API credentials:

1. Visit [Safaricom Daraja Portal](https://www.safaricom.co.ke/business/apis)
2. Sign up or login to your account
3. Create a new application or app
4. You'll receive:
   - **Consumer Key** (API Key)
   - **Consumer Secret** (API Secret)
   - **Business Shortcode** (your till/paybill number)
   - **Passkey** (security key for password generation)

### Step 2: Get Initiator Credentials (For Production)

For production use, you'll need:
- **Initiator Name**: Your M-Pesa initiator username
- **Initiator Password**: Your M-Pesa initiator password

These are needed for B2C transactions (refunds). Contact Safaricom for these.

### Step 3: Update Environment Variables

Update your `.env` file with Safaricom credentials:

```env
# M-Pesa Configuration (Safaricom API)
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=your_business_shortcode_here
MPESA_PASSKEY=your_passkey_here
MPESA_INITIATOR_NAME=your_initiator_name_here
MPESA_INITIATOR_PASSWORD=your_initiator_password_here
MPESA_ENV=sandbox  # Use 'sandbox' for testing, 'production' for live
MPESA_CALLBACK_URL=http://localhost:3000/api/webhooks/mpesa  # Update for production
```

### Step 4: Test in Sandbox

1. Install dependencies:
```bash
npm install
```

2. Update Prisma schema:
```bash
npx prisma generate
npx prisma db push
```

3. Start your dev server:
```bash
npm run dev
```

4. Test M-Pesa payment:
   - Go to http://localhost:3000/premium
   - Select a plan
   - Click "Subscribe"
   - Choose "M-Pesa" payment method
   - Enter test phone number: `254712345678`
   - Click "Pay"
   - You should see the "Payment Prompt Sent" screen

### Step 5: Production Setup

When going live:

1. **Change `MPESA_ENV` to `production`** in `.env`

2. **Update callback URL** to your production domain:
```env
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhooks/mpesa
```

3. **Configure Safaricom Callback Settings**:
   - Log into Safaricom Daraja portal
   - Set callback URL to the one above
   - Safaricom will POST payment confirmations to this endpoint

4. **Enable HTTPS**: Safaricom only sends callbacks to HTTPS endpoints

5. **Test with real M-Pesa**: Confirm with small test transactions before full launch

## How M-Pesa Payment Flow Works

```
1. User selects plan and clicks "Subscribe"
   ↓
2. User enters M-Pesa phone number (e.g., +254712345678)
   ↓
3. Frontend calls /api/payment with phone number
   ↓
4. Backend calls Safaricom STK Push API
   ↓
5. User receives payment prompt on their phone
   ↓
6. User enters M-Pesa PIN to confirm payment
   ↓
7. Safaricom processes payment
   ↓
8. Safaricom sends callback to /api/webhooks/mpesa
   ↓
9. Backend updates payment status and activates subscription
   ↓
10. Frontend detects status change and redirects to dashboard
    ↓
11. User now has premium access! 🎉
```

## Phone Number Formats Supported

The library automatically formats phone numbers:
- `0712345678` → `254712345678`
- `+254712345678` → `254712345678`
- `254712345678` → `254712345678`

## Testing Checklist

- [ ] Sandbox credentials configured in `.env`
- [ ] `npm install` run successfully
- [ ] `npx prisma db push` successful (new PaymentTransaction model)
- [ ] Dev server starts: `npm run dev`
- [ ] Premium page loads at `/premium`
- [ ] Can select M-Pesa and enter phone number
- [ ] Payment request shows "Payment Prompt Sent" screen
- [ ] Webhook endpoint is accessible from Safaricom (use ngrok for local testing)
- [ ] Payment transactions saved in database

## Webhook Testing (Local Development)

To test webhooks locally, use ngrok to expose your local server:

```bash
# Install ngrok: https://ngrok.com/
ngrok http 3000

# Use the ngrok URL as callback:
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/mpesa
```

## Troubleshooting

### Issue: "STK push failed"
- **Solution**: Check Consumer Key and Consumer Secret are correct
- Verify MPESA_ENV matches (sandbox vs production)

### Issue: "Phone number invalid"
- **Solution**: Ensure phone number starts with +254 or 0254 (Kenya only)
- Format must be: `254XXXXXXXXX` (12 digits total)

### Issue: Callback not received
- **Solution**: 
  - Verify callback URL is publicly accessible (HTTPS required for production)
  - Check firewall/security rules
  - Use ngrok for local testing
  - Verify URL in Safaricom portal settings

### Issue: "Payment transaction not found"
- **Solution**: Webhook may be arriving before transaction is created
- Add a small delay (100-200ms) before querying in webhook

## Next Steps

1. **Test M-Pesa with other payment methods** (Stripe, PayPal, Bank Transfer)
2. **Add premium feature gating** to check `subscription.plan` and restrict features
3. **Add payment history** so users can see past transactions
4. **Set up refund handling** for B2C transactions
5. **Add email receipts** after successful payment

## Support

For Safaricom API issues, contact:
- Safaricom Daraja Support: https://developer.safaricom.co.ke/
- M-Pesa Sandbox: https://sandbox.safaricom.co.ke/

For code issues with RemoDoc, check the M-Pesa library at `lib/mpesa.ts`

---

Happy payments! 💰
