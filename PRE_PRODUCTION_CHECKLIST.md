# ✅ Complete Pre-Production Checklist

## 📋 Pre-Deployment Phase

### Code Quality
- [ ] Run `npm run lint` — no errors
- [ ] All TypeScript compiles — run `npx tsc --noEmit`
- [ ] All tests pass — run `npm run payouts:test`
- [ ] Database schema matches Prisma — run `npx prisma validate`

### Dependencies
- [ ] `npm audit` — no critical vulnerabilities
- [ ] All required packages installed:
  - `stripe@^14.8.0`
  - `axios` (for PayPal)
  - `next-auth@^4.24.7`
  - `@prisma/client@5.18.0`

### Environment Variables
- [ ] `.env.local` has all required variables (see CONFIGURATION_CHECKLIST.md)
- [ ] `DATABASE_URL` is correct and accessible
- [ ] `NEXTAUTH_SECRET` is secure (32+ random chars)
- [ ] `STRIPE_SECRET_KEY` starts with `sk_`
- [ ] `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set
- [ ] M-Pesa credentials are correct
- [ ] No credentials committed to GitHub

### Database
- [ ] Database connection works: `npx prisma db push`
- [ ] All collections created:
  - [ ] `DoctorPayout`
  - [ ] `DoctorPayoutItem`
  - [ ] `PaymentTransaction`
  - [ ] Extended `DoctorProfile` fields
- [ ] Can access Prisma Studio: `npx prisma studio`

### API Endpoints
- [ ] All routes exist:
  - [ ] `GET /api/admin/payouts`
  - [ ] `POST /api/admin/payouts`
  - [ ] `PATCH /api/admin/payouts/[id]`
  - [ ] `POST /api/admin/payouts/bulk`
  - [ ] `GET /api/admin/payouts/export`
  - [ ] `GET /api/doctor/payouts`
  - [ ] `POST /api/webhooks/stripe-payouts`
  - [ ] `POST /api/webhooks/paypal-payouts`
  - [ ] `POST /api/webhooks/mpesa-b2c`
  - [ ] `POST /api/payment`
  - [ ] `POST /api/webhooks/mpesa`
  - [ ] `POST /api/webhooks/stripe`
  - [ ] `POST /api/webhooks/paypal`
- [ ] All endpoints return expected responses

### Authentication & Authorization
- [ ] NextAuth is properly configured
- [ ] Admin endpoints require admin role
- [ ] Doctor endpoints require doctor role
- [ ] Patient endpoints work for all users
- [ ] Session validation working

### Features
- [ ] Premium feature gating works
- [ ] Feature matrix by subscription tier correct
- [ ] Payment methods working:
  - [ ] M-Pesa STK push
  - [ ] Stripe Elements
  - [ ] PayPal redirect
  - [ ] Bank transfer option
- [ ] Payout calculation working
- [ ] Payout approval workflow works
- [ ] Webhook reconciliation works for all providers

---

## 🌐 Staging/Testing Phase

### Integration Testing
- [ ] Test complete payment flow:
  - [ ] M-Pesa: Phone input → STK → Polling → Status update
  - [ ] Stripe: Card input → Payment Intent → Webhook → Status
  - [ ] PayPal: Login → Order → Webhook → Status
- [ ] Test payout flow:
  - [ ] Calculate payouts → Records created
  - [ ] Admin approves → Status updated
  - [ ] Admin triggers → Provider called
  - [ ] Webhook received → Status updated
- [ ] Test bulk operations:
  - [ ] Select multiple payouts → Approve all
  - [ ] Select multiple payouts → Trigger with provider
- [ ] Test CSV export:
  - [ ] Export payouts → CSV file valid
  - [ ] Column headers correct
  - [ ] Data formatting correct
- [ ] Test doctor history:
  - [ ] Doctor can view own payouts
  - [ ] Doctor cannot view other payouts
  - [ ] Filtering works
  - [ ] Pagination works

### Provider Testing
- [ ] **Stripe:**
  - [ ] Payment Intent creation works
  - [ ] Webhook signature verified
  - [ ] Test card: 4242 4242 4242 4242
  - [ ] Declining card: 4000 0000 0000 0002
- [ ] **PayPal:**
  - [ ] Sandbox credentials working
  - [ ] Redirect to PayPal works
  - [ ] Return from PayPal works
  - [ ] Webhook received
- [ ] **M-Pesa:**
  - [ ] Sandbox STK push works (use 0788..., confirm code 123456)
  - [ ] B2C sandbox transfer works
  - [ ] Callback received
- [ ] **Bank:**
  - [ ] CSV export contains all bank details
  - [ ] Format matches accounting system

### Security Testing
- [ ] HTTPS enabled for all endpoints
- [ ] Webhook signatures verified
  - [ ] Stripe: `stripe-signature` header checked
  - [ ] PayPal: Headers verified
  - [ ] M-Pesa: `x-mpesa-signature` verified
- [ ] No sensitive data in logs
- [ ] Credentials not exposed in errors
- [ ] Admin routes require authentication
- [ ] CORS properly configured
- [ ] Rate limiting considered

### Performance Testing
- [ ] Dashboard loads in < 2s
- [ ] API responses < 500ms
- [ ] Bulk operations handle 100+ items
- [ ] CSV export handles large datasets
- [ ] Database queries are indexed

### Load Testing
- [ ] Can handle concurrent payments
- [ ] Can handle concurrent webhook deliveries
- [ ] Can calculate payouts for 1000+ doctors
- [ ] No memory leaks in long-running processes

---

## 🚀 Deployment Phase (Vercel Example)

### Pre-Deployment
- [ ] All code committed and pushed to main branch
- [ ] All tests passing in CI
- [ ] Build succeeds locally: `npm run build`
- [ ] Start succeeds locally: `npm run start`

### Vercel Setup
- [ ] Repository connected to Vercel
- [ ] All environment variables added to Vercel dashboard
- [ ] Build command set: `npx prisma generate && next build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm ci`

### Post-Deployment
- [ ] Application deployed successfully
- [ ] All routes accessible
- [ ] No build errors
- [ ] No runtime errors
- [ ] Database connectivity verified

### Provider Configuration
- [ ] **Stripe Webhook:**
  - [ ] Endpoint: `https://yourdomain.com/api/webhooks/stripe-payouts`
  - [ ] Events selected: payout.paid, payout.updated, payout.failed
  - [ ] Webhook secret saved to environment
  - [ ] Test webhook sent and verified
- [ ] **PayPal Webhook:**
  - [ ] Endpoint: `https://yourdomain.com/api/webhooks/paypal-payouts`
  - [ ] Events selected: payout success, payout failure
  - [ ] Webhook ID saved to environment
  - [ ] Test webhook sent and verified
- [ ] **M-Pesa Webhook:**
  - [ ] Endpoint: `https://yourdomain.com/api/webhooks/mpesa-b2c`
  - [ ] Webhook registered in Daraja
  - [ ] IP whitelisted if required
  - [ ] Test callback sent and verified

### GitHub Actions
- [ ] Workflow file exists: `.github/workflows/payouts.yml`
- [ ] GitHub Actions secrets configured
- [ ] Workflow runs on schedule (1st of month)
- [ ] Workflow can be manually triggered
- [ ] Workflow successfully calculates payouts

### Monitoring & Alerting
- [ ] Uptime monitoring configured (UptimeRobot, etc.)
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Webhook delivery monitoring
- [ ] Database backup scheduled
- [ ] Log aggregation setup
- [ ] Alert recipients configured

---

## 👥 Operations Phase

### Team Access
- [ ] Admin team members have dashboard access
- [ ] Admin team can approve payouts
- [ ] Admin team can trigger payouts
- [ ] Admin team can export payouts
- [ ] Finance team can access CSV exports

### Doctor Onboarding
- [ ] Doctors can add payout contact info
- [ ] Doctors can update payout preferences
- [ ] Doctors can view payout history
- [ ] Payout documentation provided to doctors

### First Payout Execution
- [ ] Calculate payouts for previous month
- [ ] Admin reviews pending payouts
- [ ] Admin approves subset of payouts
- [ ] Admin triggers payouts with provider
- [ ] Webhooks received and reconciled
- [ ] Payouts marked as PAID/FAILED
- [ ] Doctors notified of status
- [ ] Finance team reconciles with bank

### Monitoring First Month
- [ ] All webhook deliveries successful
- [ ] No failed payouts
- [ ] All provider responses received
- [ ] No duplicate payouts
- [ ] CSV export matches database
- [ ] Doctor feedback positive

---

## 📊 Post-Deployment Verification

### Week 1
- [ ] No critical errors in logs
- [ ] All webhooks delivering successfully
- [ ] Payment processing working
- [ ] Doctors receiving payouts
- [ ] No database issues
- [ ] Admin panel responsive

### Week 2-4
- [ ] System stable under load
- [ ] No security incidents
- [ ] All features working as expected
- [ ] Documentation accurate
- [ ] Team comfortable with operations
- [ ] Automated tasks running on schedule

### Month 1
- [ ] Process first full month of payouts
- [ ] Compare provider reports with database
- [ ] Reconcile with bank transfers
- [ ] Review for optimization opportunities
- [ ] Gather team feedback
- [ ] Update documentation if needed

---

## 🔄 Rollback Plan

If critical issues arise:

- [ ] Have previous version tagged in Git
- [ ] Have database backup from before deployment
- [ ] Document rollback procedure
- [ ] Test rollback in staging
- [ ] Establish rollback approval process

**Rollback steps:**

```bash
# Vercel
vercel rollback

# GitHub (if on self-hosted)
git checkout <previous-commit>
git reset --hard
npm run build && npm start

# Docker
docker run -p 3000:3000 remodoc:previous-version
```

---

## 📝 Documentation Checklist

- [ ] QUICK_START.md reviewed
- [ ] PAYOUTS_SETUP.md reviewed
- [ ] CONFIGURATION_CHECKLIST.md reviewed
- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] API documentation complete
- [ ] Troubleshooting guide reviewed
- [ ] Team trained on documentation

---

## 🎯 Success Criteria

✅ **System is ready for production when:**

1. All tests passing (6/6)
2. All environment variables configured
3. All webhooks tested and working
4. Payment flow tested end-to-end
5. Payout flow tested end-to-end
6. Admin can manage payouts
7. Doctors can view payouts
8. Feature gating working
9. Premium subscriptions gating features
10. Documentation complete
11. Team trained
12. Backups configured
13. Monitoring configured
14. Rollback plan documented

---

## 📞 Support Escalation

**Issue Resolution Path:**

1. Check logs: `pm2 logs` / `docker logs` / Vercel logs
2. Check documentation: Refer to relevant guide
3. Check provider dashboard: Stripe/PayPal/M-Pesa
4. Check database: `npx prisma studio`
5. Run tests: `npm run payouts:test`
6. Contact provider support if needed
7. Document issue and resolution

---

## ✨ Final Reminders

- ✅ Never commit `.env.local` to repository
- ✅ Keep backups of all credentials
- ✅ Monitor webhook deliveries
- ✅ Test payment providers regularly
- ✅ Keep team documentation updated
- ✅ Schedule regular security reviews
- ✅ Plan for disaster recovery
- ✅ Communicate changes to stakeholders

---

**Checklist Status**: Ready for Production ✅

**Last Updated**: December 1, 2025

**All Systems Go**: 🚀
