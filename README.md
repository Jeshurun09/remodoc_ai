# RemoDoc - AI-Powered Telehealth Platform

RemoDoc is an AI-powered telehealth web application that combines Gemini AI and Google Maps to deliver smart symptom checking, location-based care, secure medical workflows, email-based account verification, and automated SMS reminders.

## Features

### 🩺 Patients Module
- **Symptom Input**: Text, voice, or image input for symptoms
- **AI Triage**: Gemini AI analyzes symptoms and provides likely conditions, urgency levels, and care advice
- **Hospital Maps**: Find nearby hospitals with Google Maps integration
- **Appointments**: Schedule and manage medical appointments (email verification required to activate accounts)
- **SMS Reminders**: Automatic Twilio reminders for upcoming appointments
- **Offline Access**: Service worker and IndexedDB caching for offline functionality
- **Emergency Beacon**: SMS-based emergency alert system

### 👨‍⚕️ Doctors Module
- **Verified Login**: Secure authentication with role-based access
- **Case Management**: Review and manage patient cases
- **Chat Interface**: Communicate with patients
- **Prescriptions**: Create and manage prescriptions
- **AI Feedback**: Review AI-generated symptom analyses
- **Appointment Reminders**: Receive Twilio SMS reminders for scheduled visits

### 🧠 Gemini AI Integration
- Processes text and image data
- Returns likely conditions, urgency levels, and care advice
- Integrates GPS to show nearest hospitals
- Logs all AI interactions for monitoring

### 🗺️ Maps Integration
- Google Maps for hospital discovery and visualization
- Directions links powered by Google Maps
- Location-based hospital recommendations

### 💳 Premium Subscriptions & Payments
- **Multiple Payment Methods**: M-Pesa, Stripe (credit/debit), PayPal, Bank Transfer
- **Flexible Plans**: Free, Student, Individual, Small Group, Family
- **M-Pesa Integration**: STK Push for seamless mobile payments (perfect for African markets)
- **Payment History**: Track all transactions and subscription status
- **Auto-renewal**: Subscription management and expiration handling

### 🧑‍💼 Admin Dashboard
- **Doctor Verification**: Verify and manage doctor registrations
- **Hospital Management**: Add, edit, and manage hospital listings
- **AI Logs**: Monitor AI usage and performance
- **System Configuration**: Configure system settings
- **Analytics**: View system statistics and insights

### 🌐 Offline Mode
- Service worker for offline access
- IndexedDB caching for reports, hospitals, and appointments
- SMS-based emergency beacon

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB (via Prisma ORM)
- **Authentication**: NextAuth.js
- **AI**: Google Gemini AI
- **Maps**: Google Maps
- **SMS**: Twilio

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6.x+ (local instance or Atlas cluster)
- Google Gemini API key
- Google Maps API key
- SMTP credentials (for sending verification emails)
- Twilio account (for SMS emergency beacon + appointment reminders)
- M-Pesa credentials (optional, for payment processing) - [Setup Guide](./MPESA_SETUP.md)

### Installation

1. Clone the repository:
```bash
cd remodoc
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Copy `env.example` to `.env.local` (or `.env`) and fill in the placeholders. Required values include the database connection (`DATABASE_URL`), Google Maps API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), email credentials (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`), and Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).

   **Optional**: For M-Pesa payment integration, add `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, etc. See [M-Pesa Setup Guide](./MPESA_SETUP.md).

4. Sync the Prisma schema with MongoDB and seed mock data:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

   The seed script automatically falls back to MongoDB's Node driver when Prisma transactions are unavailable (e.g. on a standalone instance).

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
remodoc/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages (patient, doctor, admin)
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── page.tsx          # Home page
├── components/
│   ├── patient/          # Patient components
│   ├── doctor/           # Doctor components
│   └── admin/            # Admin components
├── lib/
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # NextAuth configuration
│   ├── gemini.ts         # Gemini AI integration
│   ├── maps.ts           # Geospatial utilities
│   ├── sms.ts            # Twilio SMS integration
│   └── offline.ts        # Offline storage utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── public/
    └── sw.js             # Service worker
```

## Usage

### For Patients

1. Register or sign in
2. Use the Symptom Checker to input symptoms (text, voice, or image)
3. Review AI analysis and recommendations
4. Find nearby hospitals using the map
5. Schedule appointments with doctors (automatic SMS reminders go out once scheduled)
6. Access emergency beacon for urgent situations

### For Doctors

1. Register with license number and specialization (verify email to activate account)
2. Wait for admin verification
3. Access patient cases and symptom reports
4. Review AI analyses and provide feedback
5. Create prescriptions
6. Communicate with patients via chat
7. Receive SMS reminders for confirmed appointments

### For Admins
Copy `env.example` to `.env.local` (or `.env`) and fill in the placeholders. Required values include the database connection (`DATABASE_URL`), email credentials (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`), and Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
1. Sign in with admin account
2. Verify doctor registrations
3. Manage hospital listings
4. Monitor AI usage logs
5. View system analytics

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration (sends verification code via email)
- `POST /api/auth/verify` - Verify email with a code
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Symptoms
- `POST /api/symptoms/analyze` - Analyze symptoms with AI

### Hospitals
- `GET /api/hospitals/nearby` - Find nearby hospitals

### Appointments
- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/[id]` - Update appointment

### Emergency
- `POST /api/emergency/beacon` - Send emergency SMS

### Doctor
- `GET /api/doctors/cases` - Get doctor cases

### Prescriptions
- `POST /api/prescriptions` - Create prescription

### Admin
- `GET /api/admin/doctors` - Get all doctors
- `POST /api/admin/doctors/verify` - Verify doctor
- `GET /api/admin/hospitals` - Get hospitals
- `POST /api/admin/hospitals` - Create hospital
- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/ai-logs` - Get AI logs

## Development

### Database Schema Updates

MongoDB models are managed via Prisma's `db push` (Prisma Migrate is not supported for MongoDB yet). After updating `schema.prisma`, run:

```bash
npx prisma db push
```

### Generate Prisma Client

```bash
npx prisma generate
```

### View Database

```bash
npx prisma studio
```

## Security Notes

- Passwords are hashed using bcrypt
- Authentication uses NextAuth.js with JWT
- API routes are protected with role-based access control
- Environment variables should never be committed

## License

This project is for educational purposes.

## Support

For issues and questions, please open an issue on the repository.
