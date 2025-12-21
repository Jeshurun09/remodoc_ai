# PayPal Integration Setup Guide

Complete guide to set up PayPal payments for RemoDoc.

## 📋 Prerequisites

- PayPal account (https://paypal.com)
- PayPal Developer account (https://developer.paypal.com)
- Business account for live payments
- Webhook endpoint (public HTTPS URL)

## 🔑 Getting PayPal Credentials

### Step 1: Create PayPal Developer Account
1. Visit https://developer.paypal.com
2. Click "Sign Up" (create account or login)
3. Accept terms and setup sandbox account (automatic)

### Step 2: Create a Sandbox App
1. Go to Dashboard → Apps & Credentials
2. Select "Sandbox" (top right)
3. Click "Create App"
4. Enter app name (e.g., "RemoDoc")
5. Select app type: "Merchant"
6. Click "Create App"

### Step 3: Get Sandbox Credentials
1. Click on your app name
2. Under "Sandbox Credentials", you'll see:
   - **Client ID**
   - **Secret** (click "Show")

Save both securely.

### Step 4: Setup Webhook
1. Go to Dashboard → Webhooks (in Sandbox)
2. Click "Create Webhook"
3. Event receiver type: "Business account"
4. Webhook URL: `https://your-domain.com/api/webhooks/paypal`
   - For local testing: Use ngrok URL
5. Select events:
   - CHECKOUT.ORDER.APPROVED
   - CHECKOUT.ORDER.COMPLETED
   - CHECKOUT.ORDER.VOIDED
6. Click "Create Webhook"
7. Find your webhook in list
8. Click on it → Copy "Webhook ID"

## 🛠️ Configuration

### 1. Update .env

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
PAYPAL_ENV=sandbox
```

For production:
```env
PAYPAL_ENV=live
```

### 2. Install Dependencies

Already included via `stripe` package installation. PayPal uses `axios` which is already installed.

```bash
npm install axios  # If not already installed
```

### 3. Update Database

```bash
npx prisma db push
```

## 💳 How PayPal Payments Work

```
1. User clicks "Pay with PayPal" button
2. Frontend calls /api/payment with method: 'paypal'
3. Backend creates PayPal order with purchase units
4. Backend returns approval URL
5. Frontend redirects user to PayPal
6. User logs in to PayPal and approves order
7. PayPal redirects back to /api/paypal/return?token=...
8. Backend captures the order
9. PayPal sends webhook: CHECKOUT.ORDER.COMPLETED
10. Backend activates subscription
11. User redirected to dashboard
```

## 🧪 Testing with PayPal Sandbox

### Sandbox vs Live

- **Sandbox**: Test environment, no real money
- **Live**: Production, real money charged

You're automatically in sandbox mode with sandbox credentials.

### Test Accounts

PayPal sandbox creates test accounts automatically. You need two accounts:
- **Business Account** (seller/receiver)
- **Personal Account** (buyer/payer)

#### To Find Test Accounts

1. Go to PayPal Developer → Sandbox → Accounts
2. You'll see pre-created accounts:
   - `sb-seller@example.com` (Business account)
   - `sb-buyer@example.com` (Personal account)

Use the personal account for testing payments.

### Testing Steps

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000/premium
3. Select a plan
4. Choose "PayPal"
5. Click "Complete Payment via PayPal"
6. You'll be redirected to PayPal sandbox
7. Click "Login" (if not already logged in)
8. Email: `sb-buyer@example.com`
9. Password: See PayPal Developer dashboard (usually auto-set)
10. Review order
11. Click "Approve"
12. You'll be redirected back to your app
13. Subscription should activate

Expected: Payment succeeds, subscription activated, redirected to dashboard

## 📡 Webhook Testing

### Setup Local Webhook Testing (ngrok)

```bash
# In one terminal, run your app
npm run dev

# In another terminal, run ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Update PayPal webhook in developer dashboard:
# Webhook URL: https://abc123.ngrok.io/api/webhooks/paypal

# Now webhooks from PayPal will reach your local app
```

### Test Webhook from Dashboard

1. Go to PayPal Developer → Webhooks
2. Find your webhook URL
3. Click on it
4. Scroll down to "Event Types"
5. Click on an event (e.g., CHECKOUT.ORDER.COMPLETED)
6. Click "Send sample event"
7. Check your app logs for webhook receipt

## 🔄 PayPal Order Flow

### Creating an Order

```typescript
const order = await createPayPalOrder({
  amount: '5.99',
  currency: 'USD',
  plan: 'individual',
  userId: 'user123'
})

// Returns:
{
  id: '3AF123456789ABC',
  status: 'CREATED',
  links: [
    {
      rel: 'approve',
      href: 'https://www.sandbox.paypal.com/checkoutnow?token=EC-...'
    }
  ]
}

// Frontend redirects user to the approval URL
```

### Capturing an Order

After user approves, backend captures:

```typescript
const result = await capturePayPalOrder(orderId)

// Returns:
{
  id: '3AF123456789ABC',
  status: 'COMPLETED',
  purchase_units: [
    {
      payments: {
        captures: [
          {
            status: 'COMPLETED',
            id: '3FH12345678...'
          }
        ]
      }
    }
  ]
}
```

## 🔐 Security Best Practices

✅ **Never expose secret** - Only use client ID on frontend
✅ **Use HTTPS** - PayPal requires it
✅ **Verify signatures** - Check X-PAYPAL-TRANSMISSION-SIG header
✅ **Use sandbox first** - Never test on live
✅ **Validate amounts server-side** - Don't trust client input
✅ **Check order status** - Verify before activating subscription
✅ **Cache tokens** - Reuse OAuth token (60s TTL)
✅ **Log transactions** - Track for audits
✅ **Handle duplicates** - Same order ID might webhook twice

## 🚨 Common Issues

### Issue: "Webhook not received"
**Solution**: 
- Ensure webhook URL is public HTTPS
- Check webhook is enabled in developer dashboard
- Use ngrok for local testing
- Check app logs for errors

### Issue: "Invalid Client ID"
**Solution**: Verify client ID in .env matches PayPal developer dashboard

### Issue: "Order creation fails"
**Solution**: 
- Check amount format (must be string: "5.99")
- Check currency is supported (USD, EUR, etc.)
- Verify API credentials are correct

### Issue: "Capture fails with 'Order not approved'"
**Solution**: 
- User didn't click "Approve" on PayPal
- Order already captured (check database)
- Payment token expired (redirect to payment again)

### Issue: "Cannot find test accounts"
**Solution**: 
- Go to PayPal Developer Dashboard
- Select "Sandbox" (top right)
- Click "Accounts"
- Auto-generated accounts should appear
- If not, create new sandbox account

### Issue: "Webhook signature verification fails"
**Solution**:
- Get fresh Webhook ID from dashboard
- Verify webhook signing secret matches
- Check timestamp is within 4 minutes
- Check transmission ID isn't reused

## 📊 Monitoring

Track these PayPal events:

- `CHECKOUT.ORDER.CREATED` - Order initiated
- `CHECKOUT.ORDER.APPROVED` - User approved on PayPal
- `CHECKOUT.ORDER.COMPLETED` - Payment captured
- `CHECKOUT.ORDER.CANCELLED` - User cancelled payment
- `CHECKOUT.ORDER.VOIDED` - Order expired or voided

View in PayPal Developer → Webhooks → Event log

## 🔄 Refunds

### Full Refund
```typescript
const refund = await paypal.post('/v2/payments/captures/{captureId}/refund', {
  amount: {
    value: '5.99',
    currency_code: 'USD'
  }
})
```

### Check Refund Status
```typescript
const capture = await paypal.get('/v2/payments/captures/{captureId}')
// capture.status will show: COMPLETED, REFUNDED, etc.
```

## 📈 Production Checklist

- [ ] Upgrade to business account
- [ ] Submit for production approval
- [ ] Switch from sandbox to live credentials
- [ ] Update webhook to production URL
- [ ] Test with real card (small amount like $0.50)
- [ ] Set up monitoring
- [ ] Document refund process
- [ ] Train support team
- [ ] Verify SSL certificate
- [ ] Test error scenarios

## 🔀 Moving to Production

1. **Upgrade to Business Account**
   - Log in to PayPal.com
   - Go to Settings → Account Settings → Business Information
   - Add business details
   - Verify phone and email

2. **Get Live Credentials**
   - Go to PayPal Developer
   - Switch to "Live" mode (top right)
   - Go to Apps & Credentials
   - Create app or use existing
   - Copy Live Client ID and Secret

3. **Update Environment**
   ```env
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_secret
   PAYPAL_ENV=live
   ```

4. **Setup Live Webhook**
   - In PayPal Developer → Webhooks → Switch to "Live"
   - Create webhook
   - URL: `https://yourdomain.com/api/webhooks/paypal`
   - Copy webhook ID

5. **Test Live**
   - Use real PayPal account or test card
   - Process payment for $0.50-$1
   - Verify payment appears in PayPal
   - Check database for transaction

6. **Deploy**
   ```bash
   git add .env
   git commit -m "Add PayPal live credentials"
   git push production
   ```

## 💡 Pro Tips

**Webhook Verification**: Always verify TRANSMISSION-ID hasn't been processed before to prevent duplicate payments

**Order Amounts**: Store actual amount in database, don't recalculate from frontend

**Return URL**: PayPal redirect URL includes `token` query param - use it to look up order

**Error Handling**: User sees PayPal's error if payment fails - provide "try again" button

**Currency**: PayPal supports 100+ currencies - check current exchange rates

## 📞 Support

- **PayPal Developer**: https://developer.paypal.com
- **API Reference**: https://developer.paypal.com/docs/api/overview/
- **Support**: https://www.paypal.com/us/smarthelp/contact-us
- **Status Page**: https://www.paypal.com/us/en/home

---

**Status**: ✅ Production Ready
**Last Updated**: November 30, 2025
