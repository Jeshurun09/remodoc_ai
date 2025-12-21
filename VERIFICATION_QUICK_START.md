# Quick Start - Doctor Verification System

## 🚀 5-Minute Setup

### Step 1: Environment Variables (1 min)

Add to `.env.local`:
```env
# Required for OTP verification
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Optional for production file upload
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_S3_REGION=us-east-1
```

### Step 2: Add Components to Dashboards (2 min)

**Doctor Dashboard:**
```tsx
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'

export default function DoctorDashboard() {
  return (
    <div>
      <DoctorProfileEditor />
    </div>
  )
}
```

**Admin Dashboard:**
```tsx
import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'

export default function AdminDashboard() {
  return (
    <div>
      <DoctorVerificationReview filter="PENDING" />
    </div>
  )
}
```

### Step 3: Verify Setup (1 min)

```bash
npm run test -- --run
```

**Expected:** ✅ 25 tests passing

## 🧪 Test the Flow

1. **Doctor submits credentials**
   - Navigate to doctor dashboard
   - Fill the credential form
   - Upload documents
   - Submit verification

2. **Doctor verifies phone**
   - Click "Send OTP"
   - Receive SMS (if Twilio configured)
   - Enter 6-digit code
   - Phone marked verified

3. **Admin reviews**
   - Navigate to admin dashboard
   - View pending requests
   - Click "Review & Take Action"
   - Approve/reject/request background check

## 📚 Key Files

- `DOCTOR_VERIFICATION_SYSTEM.md` - Complete guide
- `INTEGRATION_CHECKLIST.md` - Full integration steps
- `lib/validators.ts` - Validation functions

## ✅ Success Indicators

- [ ] Tests passing (25/25)
- [ ] No TypeScript errors
- [ ] Components load without errors
- [ ] Doctor can submit credentials
- [ ] Admin can approve/reject

## 🎯 Next Steps

1. ✅ Configure environment variables
2. ✅ Add components to dashboards
3. ✅ Run tests to verify
4. ✅ Test the complete flow
5. ✅ Deploy to staging

---

**Everything is ready!** Start with Step 1 above. 🎉
