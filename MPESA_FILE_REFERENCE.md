# M-Pesa Integration - File Reference

## Key Files Created/Modified

### Core M-Pesa Library
- **`lib/mpesa.ts`** - Complete Safaricom Daraja API integration
  - `getMpesaToken()` - OAuth token generation
  - `initiateStkPush()` - Sends payment prompt to phone
  - `queryStk()` - Check payment status
  - `parseCallback()` - Parse Safaricom webhook response
  - `verifyCallbackSignature()` - Security verification

### API Endpoints

#### Payment Processing
- **`app/api/payment/route.ts`** - POST endpoint
  - Accepts plan, paymentMethod, phoneNumber
  - Initiates STK push via M-Pesa library
  - Creates PaymentTransaction record
  - Returns checkoutRequestId for polling

#### Webhook Receiver
- **`app/api/webhooks/mpesa/route.ts`** - POST endpoint
  - Receives callbacks from Safaricom
  - Updates PaymentTransaction status
  - Activates subscription on success
  - Creates/updates user's Subscription record

#### Subscription Query
- **`app/api/subscription/route.ts`** - GET endpoint (updated)
  - Added checkoutRequestId query support
  - Allows frontend to poll payment status
  - Returns transaction and subscription status

### Frontend Components
- **`app/subscribe/payment/page.tsx`** - Payment checkout page (updated)
  - Added M-Pesa phone input field
  - "Payment Prompt Sent" waiting screen
  - Auto-polling logic (every 3 seconds)
  - Auto-redirect on successful payment

### Database Schema
- **`prisma/schema.prisma`** - Database models
  - Added `PaymentTransaction` model
  - Added `payments` relation to User model
  - Tracks: transactionId, amount, status, phone, receipt, etc.

### Configuration
- **`.env`** - Updated with M-Pesa variables
- **`env.example`** - Template for M-Pesa config
- **`package.json`** - Added axios dependency for HTTP requests

## Data Flow

### Payment Request to /api/payment
```json
{
  "plan": "individual",
  "paymentMethod": "mpesa",
  "paymentDetails": {
    "phoneNumber": "+254712345678"
  }
}
```

### Payment Response
```json
{
  "success": true,
  "checkoutRequestId": "ws_CO_02062023170139....",
  "merchantRequestId": "28033-1111-1",
  "transactionId": "mpesa_ws_CO_02062023...",
  "message": "Payment prompt sent to your phone...",
  "customerMessage": "Success. Request accepted for processing"
}
```

### M-Pesa Callback to /api/webhooks/mpesa
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "28033-1111-1",
      "CheckoutRequestID": "ws_CO_02062023170139...",
      "ResultCode": 0,
      "ResultDesc": "The service request has been accepted successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 5.99},
          {"Name": "MpesaReceiptNumber", "Value": "LHG31..."},
          {"Name": "TransactionDate", "Value": "20230602170139"}
        ]
      }
    }
  }
}
```

### Frontend Polling to /api/subscription
```
GET /api/subscription?checkoutRequestId=ws_CO_02062023170139...

Response:
{
  "transaction": {
    "id": "cuid123",
    "status": "completed"
  },
  "subscription": {
    "plan": "INDIVIDUAL",
    "status": "ACTIVE",
    "startDate": "2023-06-02T...",
    "endDate": "2023-07-02T..."
  }
}
```

## Environment Variables

```env
# Safaricom API Credentials
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_INITIATOR_NAME=initiator
MPESA_INITIATOR_PASSWORD=password

# Environment & Callback
MPESA_ENV=sandbox              # sandbox or production
MPESA_CALLBACK_URL=http://localhost:3000/api/webhooks/mpesa
```

## Testing Commands

```bash
# Install new dependency
npm install

# Update database schema
npx prisma generate
npx prisma db push

# Start dev server
npm run dev

# Test M-Pesa endpoint with curl
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "individual",
    "paymentMethod": "mpesa",
    "paymentDetails": {"phoneNumber": "+254712345678"}
  }'

# View database with Prisma Studio
npx prisma studio
```

## Security Features

✅ OAuth 2.0 token caching (expires after grant_type lifetime)
✅ Safaricom signature verification for webhooks
✅ Session authentication on all endpoints
✅ Phone number validation and formatting
✅ Timestamp-based request signing
✅ Base64 password encoding per Safaricom spec

## Error Handling

The system handles:
- Invalid phone numbers (auto-formats or rejects)
- Missing API credentials (clear error messages)
- Safaricom API failures (retry logic with timeouts)
- Webhook validation failures (returns 200 to stop retries)
- Duplicate callbacks (idempotent updates)

## Monitoring & Logging

Add to your logging service:
- M-Pesa token generation events
- STK push initiations with amounts
- Callback receipts and verification results
- Subscription status changes
- Payment failures and reasons

Example log events:
```
2024-01-15 10:30:45 - STK Push initiated for user: user_123, amount: 599, phone: 254712345678
2024-01-15 10:31:22 - M-Pesa Callback received: CheckoutRequestID=ws_CO_..., ResultCode=0
2024-01-15 10:31:23 - Payment completed, subscription activated for user: user_123, plan: INDIVIDUAL
```

## Related Documentation

- Full setup guide: `MPESA_SETUP.md`
- Safaricom Daraja API: https://developer.safaricom.co.ke/
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Prisma Docs: https://www.prisma.io/docs/
