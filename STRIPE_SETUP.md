# Stripe Integration Setup Guide

Complete guide to set up Stripe credit/debit card payments for RemoDoc.

## 📋 Prerequisites

- Stripe account (https://stripe.com)
- Test API keys
- Webhook endpoint (public HTTPS URL)

## 🔑 Getting Stripe Credentials

### Step 1: Create Stripe Account
1. Visit https://stripe.com
2. Click "Sign Up"
3. Fill in business details
4. Verify email

### Step 2: Get API Keys
1. Go to Dashboard → Developers (top right)
2. Click "Developers" dropdown
3. Select "API Keys"
4. You'll see two keys:
   - **Publishable Key** (pk_test_...)
   - **Secret Key** (sk_test_...)

Save both keys securely.

### Step 3: Get Webhook Signing Secret
1. Go to Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. For development: Use ngrok URL
   - Install: https://ngrok.com/
   - Run: `ngrok http 3000`
   - URL: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Click the endpoint you just created
7. Scroll down to "Signing secret"
8. Click "Reveal signing secret"
9. Copy it (whsec_...)

## 🛠️ Configuration

### 1. Update .env

```env
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

### 2. Install Dependencies

```bash
npm install stripe @stripe/react-stripe-js @stripe/stripe-js
```

### 3. Update Database

```bash
npx prisma db push
```

## 💳 How Stripe Payments Work

```
1. User enters card details on checkout
2. Frontend creates a PaymentIntent via /api/payment
3. PaymentIntent returned with clientSecret
4. Frontend uses Stripe Elements to confirm payment
5. User completes authentication if required
6. Stripe sends webhook: payment_intent.succeeded
7. Backend activates subscription
8. Frontend redirects to dashboard
```

## 🧪 Testing with Stripe

### Test Mode

Your keys are automatically in test mode. Test payments won't charge actual cards.

### Test Cards

| Card Number | Expiry | CVC | Description |
|-------------|--------|-----|-------------|
| 4242 4242 4242 4242 | Any future date | Any 3 digits | Success |
| 4000 0000 0000 0002 | Any future date | Any 3 digits | Card declined |
| 4000 0025 0000 3155 | Any future date | Any 3 digits | Requires authentication |
| 3782 822463 10005 | Any future date | Any 4 digits | Amex card |

### Testing Steps

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000/premium
3. Select a plan
4. Choose "Credit/Debit Card"
5. Enter test card: `4242 4242 4242 4242`
6. Expiry: `12/25`
7. CVC: `123`
8. Cardholder: `Test User`
9. Click "Pay"

Expected: Payment succeeds, subscription activated, redirected to dashboard

## 📡 Webhook Testing

### Using ngrok (Local Testing)

```bash
# Install ngrok
# Download from https://ngrok.com/download

# Run ngrok in another terminal
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Update Stripe webhook endpoint
# In Stripe Dashboard → Webhooks:
# Endpoint URL: https://abc123.ngrok.io/api/webhooks/stripe

# Your app will now receive real Stripe webhooks locally!
```

### Test Webhook Manually (Stripe Dashboard)

1. Go to Stripe Dashboard → Webhooks
2. Find your endpoint
3. Click "Send test event"
4. Select `payment_intent.succeeded`
5. Click "Send test event"
6. Check your app logs for webhook receipt

## 🔄 Payment Intent Flow

### Creating Payment Intent

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 599,           // $5.99 in cents
  currency: 'usd',
  metadata: {
    plan: 'individual',
    userId: 'user123'
  }
})

// Returns:
{
  id: 'pi_1234567890',
  client_secret: 'pi_1234567890_secret_abcdef',
  status: 'requires_payment_method'
}
```

### Frontend Confirms Payment

```typescript
// Using Stripe Elements (recommended for production)
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement // From Stripe Elements
})

const { paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: paymentMethod.id
  }
)
```

## 🔐 Security Best Practices

✅ **Never log card numbers**
✅ **Use HTTPS only** (Stripe requires it)
✅ **Use Stripe Elements** - No card data touches your server
✅ **Verify webhook signatures** - Check stripe-signature header
✅ **Use test keys in development** - Never production keys in dev
✅ **Rotate webhook signing secrets** - Periodically
✅ **Cache API tokens** - Don't call API on every request
✅ **Validate server-side** - Never trust client input

## 🚨 Common Issues

### Issue: "Invalid API Key provided"
**Solution**: Check that sk_test_ key is in `STRIPE_SECRET_KEY`

### Issue: "No webhook handlers"
**Solution**: Ensure webhook signing secret is correct in `STRIPE_WEBHOOK_SECRET`

### Issue: "Card declined"
**Solution**: Use test card 4242 4242 4242 4242 for success

### Issue: "Authentication required"
**Solution**: This is expected for test card 4000 0025 0000 3155. Click "Authenticate" in Stripe's modal.

### Issue: Webhook not received
**Solution**: 
- Check endpoint URL is public HTTPS
- Verify webhook is enabled in Stripe dashboard
- Check app logs for errors
- Use ngrok for local testing

## 📊 Monitoring

Track these Stripe events:

- `payment_intent.created` - Payment initiated
- `payment_intent.payment_failed` - Card declined
- `payment_intent.succeeded` - Payment successful
- `charge.dispute.created` - Chargeback filed
- `charge.refunded` - Refund processed

Access in Stripe Dashboard → Logs → Events

## 🔄 Refunds

### Full Refund
```typescript
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId
})
```

### Partial Refund
```typescript
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: 100 // $1.00 in cents
})
```

## 📈 Production Checklist

- [ ] Switch from test keys to live keys
- [ ] Update all API endpoints to use live URLs
- [ ] Update webhook signing secret to production value
- [ ] Test with real card (use small amount like $1)
- [ ] Set up monitoring and alerting
- [ ] Document refund process
- [ ] Train support team
- [ ] Set up fraud detection
- [ ] Verify PCI compliance
- [ ] Monitor webhook delivery rate

## 🔀 Moving to Production

1. **Get Live Keys**
   - Stripe requires business verification
   - Go to Dashboard → Developers → API Keys
   - Activate live mode
   - Copy live keys (pk_live_... and sk_live_...)

2. **Update Environment**
   ```env
   STRIPE_SECRET_KEY=sk_live_your_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
   STRIPE_WEBHOOK_SECRET=whsec_live_secret
   ```

3. **Update Webhook**
   - Add new webhook endpoint in Stripe dashboard
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Copy signing secret

4. **Deploy to Production**
   ```bash
   git add .env
   git commit -m "Add Stripe production keys"
   git push production
   ```

5. **Test Live**
   - Use real test card with test amount ($0.50 or $1)
   - Verify payment succeeds
   - Verify subscription activates
   - Verify webhook received

## 📞 Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **API Reference**: https://stripe.com/docs/api

---

**Status**: ✅ Production Ready
**Last Updated**: November 30, 2025
