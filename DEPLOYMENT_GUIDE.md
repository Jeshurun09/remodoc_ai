# 🚀 Deployment Guide (Vercel, Docker, Self-Hosted)

## Option 1: Vercel Deployment (Recommended for Next.js)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: complete payment and payout system"
git push origin main
```

### Step 2: Connect to Vercel
1. Go to: https://vercel.com/new
2. Select your GitHub repository
3. Click "Import"

### Step 3: Configure Environment Variables

**In Vercel Dashboard → Settings → Environment Variables:**

Add all variables from `.env.local`:

```
DATABASE_URL=mongodb+srv://...
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=<your-secret>
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
MPESA_B2C_CONSUMER_KEY=...
MPESA_B2C_CONSUMER_SECRET=...
MPESA_B2C_SECURITY_CREDENTIAL=...
MPESA_B2C_INITIATOR_NAME=...
MPESA_WEBHOOK_SECRET=...
PAYOUT_CONSULTATION_RATE=500
PAYOUT_CURRENCY=KES
```

### Step 4: Configure Build Settings

**Build Command:**
```bash
npx prisma generate && next build
```

**Output Directory:**
`.next`

**Install Command:**
```bash
npm ci
```

### Step 5: Deploy

Click "Deploy" → Vercel automatically builds and deploys

### Step 6: Update Provider Webhooks

Update webhook endpoints in provider dashboards:

**Stripe:**
```
https://your-vercel-domain.vercel.app/api/webhooks/stripe-payouts
```

**PayPal:**
```
https://your-vercel-domain.vercel.app/api/webhooks/paypal-payouts
```

**M-Pesa:**
```
https://your-vercel-domain.vercel.app/api/webhooks/mpesa-b2c
```

### Step 7: Enable GitHub Actions (Payouts)

**Enable in GitHub:**
1. Settings → Actions → General
2. Select "Allow all actions and reusable workflows"

**Configure Secrets for Actions:**

GitHub → Settings → Secrets and variables → Actions

Add:
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `MPESA_B2C_CONSUMER_KEY`
- `MPESA_B2C_CONSUMER_SECRET`

---

## Option 2: Docker Deployment

### Step 1: Create Dockerfile

```dockerfile
# Use Node 20 LTS
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      # ... add all other env vars
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password

volumes:
  mongodb_data:
```

### Step 3: Build and Run

```bash
# Build image
docker build -t remodoc:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="mongodb://..." \
  -e NEXTAUTH_SECRET="..." \
  remodoc:latest

# Or with docker-compose
docker-compose up
```

### Step 4: Push to Registry

```bash
# Docker Hub
docker tag remodoc:latest yourname/remodoc:latest
docker push yourname/remodoc:latest

# GitHub Container Registry
docker tag remodoc:latest ghcr.io/yourname/remodoc:latest
docker push ghcr.io/yourname/remodoc:latest
```

---

## Option 3: Self-Hosted (AWS EC2, DigitalOcean, etc.)

### Step 1: Provision Server

**Minimum Requirements:**
- Ubuntu 22.04 LTS
- 2GB RAM, 20GB SSD
- Node.js 18+

### Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Clone repository
cd /var/www
git clone https://github.com/yourusername/remodoc.git
cd remodoc
```

### Step 3: Setup Environment

```bash
# Copy env template
cp env.example .env.local

# Edit with your credentials
nano .env.local

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push
```

### Step 4: Build Application

```bash
npm run build
```

### Step 5: Configure PM2

**Create `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [{
    name: 'remodoc',
    script: '.next/standalone/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

**Start with PM2:**

```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Step 6: Configure Nginx

**Create `/etc/nginx/sites-available/remodoc`:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook endpoints (important for production)
    location /api/webhooks/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/remodoc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Setup SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 8: Setup Cron for Payouts

```bash
# Edit crontab
crontab -e

# Add monthly payout calculation (1st of month at midnight)
0 0 1 * * cd /var/www/remodoc && npx ts-node scripts/calc_payouts.ts >> /var/log/remodoc-payouts.log 2>&1
```

---

## Post-Deployment Validation

### Step 1: Health Checks

```bash
# Test API is accessible
curl https://yourdomain.com/api/admin/payouts -H "Authorization: Bearer token"

# Test webhooks are reachable
curl -X POST https://yourdomain.com/api/webhooks/stripe-payouts

# Check database connection
curl https://yourdomain.com/api/health
```

### Step 2: SSL Certificate Check

```bash
# Verify SSL is working
curl -I https://yourdomain.com

# Check certificate details
openssl s_client -connect yourdomain.com:443
```

### Step 3: Webhook Testing

**In provider dashboards, send test webhooks:**

- Stripe → Webhooks → Send test event
- PayPal → Webhooks → Send webhook
- M-Pesa → Send test transaction

**Verify in application logs:**

```bash
# Vercel
vercel logs

# Docker
docker logs container_id

# Self-hosted (PM2)
pm2 logs remodoc

# Self-hosted (Nginx)
sudo tail -f /var/log/nginx/error.log
```

### Step 4: Database Integrity

```bash
# Open Prisma Studio
npx prisma studio

# Verify collections exist and have data
# Check: DoctorPayout, DoctorPayoutItem, PaymentTransaction
```

---

## Monitoring & Maintenance

### Set Up Monitoring

**Uptime Monitoring:**
- Use: UptimeRobot, Pingdom, or CloudFlare
- Monitor: https://yourdomain.com/api/health

**Error Tracking:**
- Sentry: Add to your app for error reporting
- LogRocket: For frontend performance

**Analytics:**
- Google Analytics
- PostHog or Plausible for privacy-friendly analytics

### Log Rotation

**For self-hosted:**

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/remodoc > /dev/null <<EOF
/var/log/remodoc-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nobody adm
}
EOF
```

### Backup Strategy

```bash
# Daily database backups
mongodump --uri="mongodb+srv://..." --out=/backups/$(date +%Y%m%d)

# Store backups off-site (AWS S3, etc.)
aws s3 sync /backups s3://your-backup-bucket/
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs remodoc
docker logs container_id

# Common issues:
# 1. Prisma client not generated
npx prisma generate

# 2. Environment variables missing
cat .env.local

# 3. Database connection failed
npx prisma db push
```

### Webhooks not received

```bash
# Check firewall
sudo ufw status
sudo ufw allow 443/tcp

# Check Nginx is running
sudo systemctl status nginx

# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/stripe-payouts
```

### High memory/CPU usage

```bash
# Check PM2 status
pm2 monit

# Restart process
pm2 restart remodoc

# Check database queries
npx prisma studio
```

---

## Performance Optimization

### 1. Enable Caching

```javascript
// app/api/admin/payouts/route.ts
export const revalidate = 3600 // Cache for 1 hour
```

### 2. Database Indexing

```prisma
// prisma/schema.prisma
model DoctorPayout {
  @@index([doctorId])
  @@index([status])
  @@index([createdAt])
}
```

### 3. CDN Configuration

- Use Vercel CDN (automatic)
- Or CloudFlare for additional caching

### 4. Database Connection Pooling

```typescript
// Add to Prisma
// prisma/schema.prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

---

## Rollback Plan

**If deployment fails:**

```bash
# Vercel
vercel rollback

# GitHub Actions
git revert <commit-hash>
git push

# Docker
docker run -p 3000:3000 remodoc:previous-tag

# Self-hosted
cd /var/www/remodoc
git checkout <previous-commit>
npm run build
pm2 restart remodoc
```

---

## Success Checklist

- [ ] Application deployed
- [ ] All environment variables configured
- [ ] Database connected and schema pushed
- [ ] Webhooks tested with real providers
- [ ] Payment flow works end-to-end
- [ ] Payout calculation runs on schedule
- [ ] Admin panel accessible
- [ ] Doctor panel accessible
- [ ] Monitoring/alerting configured
- [ ] Backups configured
- [ ] SSL certificate valid
- [ ] Team trained on operations

---

**Deployment Status**: Ready for all environments

**Last Updated**: December 1, 2025
