# M-Pesa Integration Flow Diagram

## Complete Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ RemoDoc Premium Subscription │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: User Selects Plan
┌──────────────────┐
│ /premium page │
│ (Plan selection)│
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ User clicks "Subscribe" │
└────────┬─────────────────┘
         │
         ▼

STEP 2: User Enters M-Pesa Phone
┌────────────────────────────────────────┐
│ /subscribe/payment?plan=individual │
│ ┌─────────────────────────────────┐ │
│ │ Select Payment Method: │ │
│ │ [ Card] [ PayPal] [ M-Pesa] │ │
│ │ ✓ Selected: M-Pesa │ │
│ ├─────────────────────────────────┤ │
│ │ Phone Number: +254712345678 │ │
│ │ [Pay $5.99/month] │ │
│ └─────────────────────────────────┘ │
└────────┬─────────────────────────────────┘
         │
         ▼

STEP 3: Frontend Calls Payment API
┌────────────────────────────────────────────┐
│ Frontend: fetch('/api/payment', { │
│ plan: 'individual', │
│ paymentMethod: 'mpesa', │
│ paymentDetails: { │
│ phoneNumber: '+254712345678' │
│ } │
│ }) │
└────────┬─────────────────────────────────────┘
         │
         ▼

STEP 4: Backend Processes Payment
┌─────────────────────────────────────────────┐
│ /api/payment (POST) │
│ ├─ Validate session & phone number │
│ ├─ Format phone: +254712345678 │
│ ├─ Call getMpesaToken() │
│ │ └─ Get OAuth token from Safaricom │
│ ├─ Call initiateStkPush() │
│ │ └─ Send to Safaricom STK Push endpoint │
│ └─ Create PaymentTransaction record │
│ └─ status: 'pending' │
└────────┬────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Safaricom Response: │
│ { │
│ CheckoutRequestID: "ws_CO_...", │
│ MerchantRequestID: "28033-...", │
│ ResponseCode: "0", │
│ CustomerMessage: "Success..." │
│ } │
└────────┬─────────────────────────────┘
         │
         ▼

STEP 5: Frontend Receives Checkout ID
┌──────────────────────────────────────────────────┐
│ Frontend Response: │
│ { │
│ checkoutRequestId: "ws_CO_...", │
│ transactionId: "mpesa_ws_CO_...", │
│ message: "Payment prompt sent to your phone..." │
│ } │
└────────┬─────────────────────────────────────────┘
         │
         ▼

STEP 6: STK Push Sent to Phone
┌──────────────────────────────────────────┐
│ User's Phone: │
│ ┌────────────────────────────────────┐ │
│ │ Safaricom │ │
│ │ Enter M-Pesa PIN │ │
│ │ Amount: KES 599 │ │
│ │ Pay To: RemoDoc │ │
│ │ │ │
│ │ [Enter PIN] [Cancel] │ │
│ └────────────────────────────────────┘ │
└────────┬───────────────────────────────────┘
         │
         ├─ User enters PIN
         │
         ▼

STEP 7: Frontend Shows Waiting Screen
┌────────────────────────────────────────┐
│ /subscribe/payment (waiting state) │
│ ┌──────────────────────────────────┐ │
│ │ Payment Prompt Sent │ │
│ │ Check your phone for the │ │
│ │ M-Pesa payment prompt and │ │
│ │ enter your PIN to complete │ │
│ │ the transaction. │ │
│ │ │ │
│ │ Page auto-redirects when │ │
│ │ payment is confirmed... │ │
│ │ [Cancel] │ │
│ └──────────────────────────────────┘ │
└────────┬───────────────────────────────────┘
         │
         │ Frontend: setTimeout(() => {
         │ polling loop:
         │ GET /api/subscription?checkoutRequestId=...
         │ every 3 seconds (max 5 min)
         │ }, 1000)
         │
         ▼

STEP 8: Safaricom Processes Payment
┌───────────────────────────────────────────┐
│ Safaricom Gateway │
│ ├─ Validate M-Pesa PIN │
│ ├─ Charge customer account │
│ ├─ Credit merchant (RemoDoc) account │
│ └─ Prepare callback response │
└────────┬────────────────────────────────────┘
         │
         ▼

STEP 9: Safaricom Sends Webhook Callback
┌─────────────────────────────────────────────┐
│ Safaricom: POST /api/webhooks/mpesa │
│ { │
│ Body: { │
│ stkCallback: { │
│ MerchantRequestID: "28033-...", │
│ CheckoutRequestID: "ws_CO_...", │
│ ResultCode: 0, ← 0 = success │
│ ResultDesc: "Success...", │
│ CallbackMetadata: { │
│ Item: [ │
│ {Name: "Amount", Value: 599}, │
│ {Name: "MpesaReceiptNumber", ... │
│ {Name: "TransactionDate", ... │
│ ] │
│ } │
│ } │
│ } │
│ } │
└────────┬────────────────────────────────────┘
         │
         ▼

STEP 10: Backend Webhook Handler
┌────────────────────────────────────────────────┐
│ /api/webhooks/mpesa (POST) │
│ ├─ Parse callback payload │
│ ├─ Verify signature (security) │
│ ├─ Find PaymentTransaction by checkoutId │
│ ├─ Update status: 'completed' │
│ │ │
│ ├─ If successful (ResultCode = 0): │
│ │ ├─ Get plan name from transaction │
│ │ ├─ Create/update Subscription: │
│ │ │ ├─ plan: 'INDIVIDUAL' │
│ │ │ ├─ status: 'ACTIVE' │
│ │ │ ├─ endDate: 1 month from now │
│ │ │ └─ paymentMethod: 'mpesa' │
│ │ └─ Store receipt number │
│ │ │
│ └─ Return 200 OK (acknowledge receipt) │
└────────┬─────────────────────────────────────────┘
         │
         ▼

STEP 11: Frontend Polling Detects Success
┌────────────────────────────────────────────┐
│ Frontend: GET /api/subscription?... │
│ Response: │
│ { │
│ transaction: { │
│ status: "completed" ← SUCCESS! │
│ }, │
│ subscription: { │
│ plan: "INDIVIDUAL", │
│ status: "ACTIVE", │
│ endDate: "2024-07-15T..." │
│ } │
│ } │
└────────┬────────────────────────────────────┘
         │
         ▼

STEP 12: Auto-Redirect to Dashboard
┌────────────────────────────────────┐
│ router.push( │
│ '/dashboard/patient? │
│ premium=activated' │
│ ) │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ /dashboard/patient │
│ Premium features unlocked! │
│ Telemedicine available │
│ IoT integrations enabled │
│ Analytics available │
│ Priority support │
└────────────────────────────────────┘
```

## Error Scenarios

### Scenario 1: User Cancels Payment
```
User's Phone: User selects [Cancel]
                    ↓
Safaricom Callback: ResultCode = 1 (cancelled)
                    ↓
Backend: Update PaymentTransaction status = "failed"
                    ↓
Frontend: Polling detects status != "ACTIVE"
                    ↓
User: Stays on payment page, can retry
```

### Scenario 2: Invalid Phone Number
```
Frontend: User enters "invalid123"
                    ↓
Backend: M-Pesa library formats to "254invalid123"
                    ↓
Safaricom: Returns ResponseCode != "0"
                    ↓
Backend: Returns error: "STK push failed"
                    ↓
Frontend: Shows error message
```

### Scenario 3: Network Timeout
```
Frontend: Polling for 5 minutes
                    ↓
5 min timeout reached
                    ↓
Stop polling, show timeout message
                    ↓
User can manually check dashboard or retry
```

## Database State Timeline

```
Time Database State
─────────────────────────────────────────────────────────────────

T0 User submits payment
        PaymentTransaction:
        - status: "pending"
        - checkoutRequestId: "ws_CO_..."

T1 Frontend polls every 3 seconds
        (Database unchanged)

T2 Safaricom calls webhook
        PaymentTransaction:
        - status: "completed" ← UPDATED
        - receiptNumber: "LHG31..."

        Subscription:
        - plan: "INDIVIDUAL" ← CREATED
        - status: "ACTIVE"
        - endDate: "2024-07-15T..."

T3 Frontend detects status change
        (Polls and gets updated subscription)
        Auto-redirects to dashboard
```

## Key Differences Between Methods

```
┌─────────────┬──────────────────┬──────────────┬──────────────┐
│ Method │ Flow Type │ UI │ Time │
├─────────────┼──────────────────┼──────────────┼──────────────┤
│ M-Pesa │ Async (webhook) │ STK Push │ 5-30 seconds │
│ Stripe │ Sync (form) │ Card form │ 1-3 seconds │
│ PayPal │ Sync (redirect) │ PayPal page │ 5-10 seconds │
│ Bank │ Manual │ Info shown │ 1-5 days │
└─────────────┴──────────────────┴──────────────┴──────────────┘
```

---

**Note**: M-Pesa is perfect for African markets (Kenya, Tanzania, Uganda) where mobile money is ubiquitous and more trusted than cards!
