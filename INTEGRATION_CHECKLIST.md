# Doctor Verification System - Integration Checklist

## Pre-Integration Review

- [x] All API endpoints created and typed
- [x] Database schema updated with Prisma client generated
- [x] Frontend components created with TypeScript
- [x] Validation functions tested (4/4 passing)
- [x] Integration tests created (21/21 passing)
- [x] Dependencies installed
- [x] Documentation complete
- [x] No TypeScript compilation errors

## Integration Steps

### Step 1: Add Components to Dashboard
- [ ] Import `DoctorProfileEditor` in doctor dashboard
- [ ] Import `DoctorVerificationReview` in admin dashboard
- [ ] Test component rendering without errors

### Step 2: Configure Environment Variables
- [ ] Set `TWILIO_ACCOUNT_SID`
- [ ] Set `TWILIO_AUTH_TOKEN`
- [ ] Set `TWILIO_PHONE_NUMBER`
- [ ] (Optional) Set AWS_* variables for S3 if production upload desired

### Step 3: Test Doctor Flow
- [ ] Doctor navigates to profile editor
- [ ] Doctor fills credential form
- [ ] Doctor uploads files
- [ ] Doctor submits verification
- [ ] System shows "Verification submitted" message
- [ ] Request appears in admin dashboard

### Step 4: Test OTP Verification
- [ ] Doctor clicks "Send OTP" button
- [ ] Doctor receives SMS with 6-digit code
- [ ] Doctor enters code in form
- [ ] System confirms phone verified
- [ ] PhoneOtp record deleted after verification

### Step 5: Test Admin Review
- [ ] Admin accesses verification review page
- [ ] Admin sees pending verification requests
- [ ] Admin clicks "Review & Take Action"
- [ ] Admin can approve with notes
- [ ] Admin can reject with notes
- [ ] Admin can request background check
- [ ] DoctorProfile status updated after action
- [ ] Verification status changes reflect in doctor view

### Step 6: Test Audit Trail
- [ ] Query `/api/admin/doctor-verifications` with status filter
- [ ] Verify AuditLog entries created for each action
- [ ] Check audit logs contain: actor ID, action, target ID, timestamp

### Step 7: Test File Upload
- [ ] Upload via dev mode (`/api/uploads`) - should work
- [ ] Verify file appears in `public/uploads/` directory
- [ ] Test S3 presign endpoint (if AWS configured) - should return presigned URL
- [ ] If S3 not configured - should return 501 with dev mode message

### Step 8: Test Error Handling
- [ ] Submit without required fields - should return 400
- [ ] Submit with invalid email - should return 400
- [ ] Submit with invalid URL - should return 400
- [ ] Submit with invalid national ID - should return 400
- [ ] Submit without session - should return 401

### Step 9: Test Edge Cases
- [ ] OTP expires after 10 minutes - can't verify old code
- [ ] Multiple verification requests from same doctor - latest visible
- [ ] Admin can't approve own request (if applicable)
- [ ] Background check reference stored correctly
- [ ] Admin notes sanitized (no HTML injection)

### Step 10: Deployment
- [ ] Run `npm run build` - no errors
- [ ] Run tests one more time - all passing
- [ ] Deploy to staging
- [ ] Full end-to-end test in staging
- [ ] Deploy to production
- [ ] Monitor logs for errors

## Rollback Plan

If issues occur after deployment:
1. Revert `prisma/schema.prisma` changes
2. Run `npx prisma migrate reset` to previous state
3. Disable new API endpoints in routing
4. Remove DoctorProfileEditor and DoctorVerificationReview from dashboards

## Support Checklist

- [ ] Document all environment variables needed
- [ ] Create admin guide for using verification review
- [ ] Create doctor guide for credential submission
- [ ] Set up monitoring/alerts for verification endpoint errors
- [ ] Create database backup before going live
- [ ] Have support contact for Twilio issues
- [ ] Have support contact for AWS S3 issues (if applicable)

## Post-Deployment Monitoring

- [ ] Monitor `/api/doctor/verification` error rate
- [ ] Monitor `/api/admin/doctor-verifications` response times
- [ ] Check OTP SMS delivery rate (should be near 100%)
- [ ] Review audit logs daily for suspicious patterns
- [ ] Check file upload storage usage (public/uploads/)
- [ ] Monitor Twilio SMS costs

## Known Limitations to Document

1. Background check integration is manual - admin must track externally
2. Email notifications not implemented - admin must notify doctor
3. Bulk rejection not available - must reject one by one
4. SMS delivery depends on Twilio availability
5. S3 upload requires AWS account and configuration
6. OTP codes expire after 10 minutes
7. Presigned URLs valid for 1 hour

## Success Metrics

- Doctor verification submission time < 5 minutes average
- OTP delivery < 30 seconds
- Admin review/approval time < 2 minutes
- Zero authentication bypass attempts
- Zero audit log gaps
- SMS delivery rate > 99%
- API response time < 500ms

## Documentation References

- **Complete System Guide:** `DOCTOR_VERIFICATION_SYSTEM.md`
- **Upload Strategy:** `DOCTOR_VERIFICATION_UPLOADS.md`
- **Implementation Details:** `DOCTOR_VERIFICATION_IMPLEMENTATION.md`
- **Code Comments:** See individual API files

## Quick Reference

### Key API Endpoints
```
POST   /api/doctor/verification          - Submit credentials
GET    /api/doctor/verification          - List own requests
POST   /api/doctor/verification/send-otp - Send OTP
POST   /api/doctor/verification/verify-otp - Verify OTP
GET    /api/admin/doctor-verifications   - List all (admin)
GET    /api/admin/doctor-verifications/{id} - View detail (admin)
PUT    /api/admin/doctor-verifications/{id} - Admin action (admin)
POST   /api/uploads                      - Dev file upload
POST   /api/uploads/s3-presign           - S3 presigned URL
```

### Key Components
```
DoctorProfileEditor      - Doctor credential form
DoctorVerificationReview - Admin review interface
```

### Key Validators
```
isValidEmail()         - Email format
isValidUrl()           - URL format
isLikelyNationalId()   - National ID heuristic
sanitizeShort()        - HTML sanitization
```

## Questions to Answer

Before going live, make sure you can answer:
1. How will rejected doctors be notified?
2. How long is the typical admin review time?
3. Who has access to audit logs?
4. How are background checks tracked?
5. What's the data retention policy for OTP codes?
6. How will sensitive files be secured in S3?
7. Who monitors Twilio SMS delivery?
8. What's the escalation path for verification issues?

---

**Ready to integrate!** Follow the steps above and refer to the documentation files for detailed implementation guidance.
