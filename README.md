# RemoDoc - AI-Powered Telehealth Platform

RemoDoc is an AI-powered telehealth web application that combines Gemini AI and Google Maps to deliver smart symptom checking, location-based care, and secure medical workflows.

## Features

### 🩺 Patients Module
- **Symptom Input**: Text, voice, or image input for symptoms
- **AI Triage**: Gemini AI analyzes symptoms and provides likely conditions, urgency levels, and care advice
- **Hospital Maps**: Find nearby hospitals with Google Maps integration
- **Appointments**: Schedule and manage medical appointments
- **Offline Access**: Service worker and IndexedDB caching for offline functionality
- **Emergency Beacon**: SMS-based emergency alert system

### 👨‍⚕️ Doctors Module
- **Verified Login**: Secure authentication with role-based access
- **Case Management**: Review and manage patient cases
- **Chat Interface**: Communicate with patients
- **Prescriptions**: Create and manage prescriptions
- **AI Feedback**: Review AI-generated symptom analyses

### 🧠 Gemini AI Integration
- Processes text and image data
- Returns likely conditions, urgency levels, and care advice
- Integrates GPS to show nearest hospitals
- Logs all AI interactions for monitoring

### 🗺️ Maps Integration
- Google Maps for hospital discovery
- Directions and emergency routing
- Location-based hospital recommendations

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
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: Google Gemini AI
- **Maps**: Google Maps API
- **SMS**: Twilio

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key
- Google Maps API key (optional, for maps functionality)
- Twilio account (optional, for SMS emergency beacon)

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
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"

# Google Gemini AI
GEMINI_API_KEY="your-gemini-api-key-here"

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key-here"

# Twilio (for SMS)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

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
│   ├── maps.ts           # Google Maps utilities
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
5. Schedule appointments with doctors
6. Access emergency beacon for urgent situations

### For Doctors

1. Register with license number and specialization
2. Wait for admin verification
3. Access patient cases and symptom reports
4. Review AI analyses and provide feedback
5. Create prescriptions
6. Communicate with patients via chat

### For Admins

1. Sign in with admin account
2. Verify doctor registrations
3. Manage hospital listings
4. Monitor AI usage logs
5. View system analytics

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
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

### Database Migrations

```bash
npx prisma migrate dev
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
