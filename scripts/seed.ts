import { PrismaClient, UserRole, DoctorVerificationStatus, AppointmentStatus, UrgencyLevel } from '@prisma/client'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()
const mongoUrl = process.env.MONGODB_URL

if (!mongoUrl) {
  throw new Error('MONGODB_URL is not defined. Please set it in your .env file.')
}

async function resetDatabase() {
  console.log('🧹 Clearing existing data (direct Mongo cleanup)...')
  const client = new MongoClient(mongoUrl)
  const collections = [
    'AILog',
    'Message',
    'Prescription',
    'Appointment',
    'SymptomReport',
    'DoctorProfile',
    'PatientProfile',
    'Hospital',
    'SystemConfig',
    'User'
  ]

  try {
    await client.connect()
    const db = client.db()

    for (const name of collections) {
      const exists = await db.listCollections({ name }).hasNext()
      if (exists) {
        await db.collection(name).deleteMany({})
      }
    }
  } finally {
    await client.close()
  }
}

async function createHospitals() {
  console.log('🏥 Creating hospitals...')
  const hospitals = [
    {
      name: 'Metro General Hospital',
      address: '123 City Center Blvd',
      city: 'Metropolis',
      state: 'NY',
      zipCode: '10001',
      phone: '(212) 555-0186',
      latitude: 40.7505,
      longitude: -73.9934,
      specialties: JSON.stringify(['Emergency', 'Cardiology', 'Neurology']),
      emergency: true,
      active: true
    },
    {
      name: 'Lakeside Community Clinic',
      address: '45 Lake View Dr',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      phone: '(217) 555-0299',
      latitude: 39.7984,
      longitude: -89.6544,
      specialties: JSON.stringify(['Pediatrics', 'Family Medicine']),
      emergency: false,
      active: true
    }
  ]

  for (const hospital of hospitals) {
    await prisma.hospital.create({ data: hospital })
  }
}

async function createUsers() {
  console.log('👥 Creating sample users...')

  const password = await bcrypt.hash('Password123!', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'Amelia Admin',
      email: 'admin@remodoc.app',
      password,
      role: UserRole.ADMIN,
      phone: '+15555550100'
    }
  })

  const patient = await prisma.user.create({
    data: {
      name: 'Peter Patient',
      email: 'patient@remodoc.app',
      password,
      role: UserRole.PATIENT,
      phone: '+15555550101',
      patientProfile: {
        create: {
          dob: new Date('1993-04-15'),
          address: '789 Elm Street',
          emergencyContact: 'Mary Patient',
          emergencyPhone: '+15555550999',
          bloodType: 'O+',
          allergies: 'Peanuts'
        }
      }
    },
    include: {
      patientProfile: true
    }
  })

  const doctor = await prisma.user.create({
    data: {
      name: 'Derek Doctor',
      email: 'doctor@remodoc.app',
      password,
      role: UserRole.DOCTOR,
      phone: '+15555550102',
      doctorProfile: {
        create: {
          licenseNumber: 'DOC-44321',
          specialization: 'Cardiology',
          yearsExperience: 8,
          verificationStatus: DoctorVerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: admin.id,
          hospital: 'Metro General Hospital'
        }
      }
    },
    include: {
      doctorProfile: true
    }
  })

  return { admin, patient, doctor }
}

async function createMedicalData(patientId: string, doctorId: string, patientProfileId?: string) {
  console.log('📋 Creating medical records...')

  const symptomReport = await prisma.symptomReport.create({
    data: {
      patientId: patientProfileId!,
      symptoms: 'Chest pain with occasional shortness of breath during mild exercise.',
      urgency: UrgencyLevel.HIGH,
      likelyConditions: JSON.stringify(['Angina', 'Anxiety']),
      careAdvice: 'Schedule cardiac stress test and monitor vitals. Avoid strenuous activity.',
      locationLat: 40.741,
      locationLng: -73.989,
      aiAnalysis: JSON.stringify({
        riskScore: 0.74,
        recommendations: ['Schedule in-person visit', 'Collect vitals daily']
      })
    }
  })

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patientProfileId!,
      doctorId,
      symptomReportId: symptomReport.id,
      status: AppointmentStatus.CONFIRMED,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      notes: 'Discuss lab results and stress test preparation.'
    }
  })

  await prisma.prescription.create({
    data: {
      doctorId,
      patientId: patientProfileId!,
      medication: 'Atorvastatin 20mg',
      dosage: '1 tablet daily',
      instructions: 'Take with evening meal',
      startDate: new Date(),
      endDate: null
    }
  })

  const messages = [
    {
      senderId: doctorId,
      receiverId: patientId,
      content: 'Please remember to log any symptoms you experience before our appointment.'
    },
    {
      senderId: patientId,
      receiverId: doctorId,
      content: 'Thanks doctor! I will bring my recent vitals as well.'
    }
  ]

  for (const message of messages) {
    await prisma.message.create({ data: message })
  }

  await prisma.aILog.create({
    data: {
      userId: patientId,
      inputType: 'text',
      input: 'Having recurring chest discomfort and slight dizziness.',
      output: 'Recommended immediate teleconsultation and provided breathing exercises.',
      model: 'gemini-pro',
      tokensUsed: 294,
      latency: 1200
    }
  })

  await prisma.systemConfig.upsert({
    where: { key: 'triage_threshold' },
    update: {
      value: JSON.stringify({ low: 0.25, medium: 0.5, high: 0.75 }),
      updatedBy: doctorId
    },
    create: {
      key: 'triage_threshold',
      value: JSON.stringify({ low: 0.25, medium: 0.5, high: 0.75 }),
      updatedBy: doctorId
    }
  })

  console.log(`✅ Created appointment ${appointment.id} and linked records.`)
}

async function main() {
  await resetDatabase()

  try {
    await createHospitals()
    const { patient, doctor } = await createUsers()
    await createMedicalData(patient.id, doctor.id, patient.patientProfile?.id)
    console.log('🎉 Mock data seeded successfully!')
  } catch (err: any) {
    // Prisma requires replica set for transactions with MongoDB. If user runs a standalone server,
    // fall back to inserting documents directly via the MongoDB Node driver.
    if (err?.code === 'P2031') {
      console.warn('⚠️ Prisma needs a replica set. Falling back to direct MongoDB inserts...')
      await seedViaMongoClient()
    } else {
      throw err
    }
  }
}

async function seedViaMongoClient() {
  console.log('🧪 Seeding using MongoClient fallback...')
  const client = new MongoClient(mongoUrl)

  try {
    await client.connect()
    const db = client.db()

    // create hospitals
    const hospitals = [
      {
        _id: randomUUID(),
        name: 'Metro General Hospital',
        address: '123 City Center Blvd',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        phone: '(212) 555-0186',
        latitude: 40.7505,
        longitude: -73.9934,
        specialties: JSON.stringify(['Emergency', 'Cardiology', 'Neurology']),
        emergency: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: randomUUID(),
        name: 'Lakeside Community Clinic',
        address: '45 Lake View Dr',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        phone: '(217) 555-0299',
        latitude: 39.7984,
        longitude: -89.6544,
        specialties: JSON.stringify(['Pediatrics', 'Family Medicine']),
        emergency: false,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    await db.collection('Hospital').insertMany(hospitals)

    const passwordHash = await bcrypt.hash('Password123!', 10)

    // users
    const adminId = randomUUID()
    const patientUserId = randomUUID()
    const doctorUserId = randomUUID()

    const admin = {
      _id: adminId,
      email: 'admin@remodoc.app',
      password: passwordHash,
      name: 'Amelia Admin',
      role: 'ADMIN',
      phone: '+15555550100',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const patient = {
      _id: patientUserId,
      email: 'patient@remodoc.app',
      password: passwordHash,
      name: 'Peter Patient',
      role: 'PATIENT',
      phone: '+15555550101',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const doctor = {
      _id: doctorUserId,
      email: 'doctor@remodoc.app',
      password: passwordHash,
      name: 'Derek Doctor',
      role: 'DOCTOR',
      phone: '+15555550102',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await Promise.all([
      db.collection('User').insertOne(admin),
      db.collection('User').insertOne(patient),
      db.collection('User').insertOne(doctor)
    ])

    // patient profile
    const patientProfileId = randomUUID()
    await db.collection('PatientProfile').insertOne({
      _id: patientProfileId,
      userId: patientUserId,
      dob: new Date('1993-04-15'),
      address: '789 Elm Street',
      emergencyContact: 'Mary Patient',
      emergencyPhone: '+15555550999',
      bloodType: 'O+',
      allergies: 'Peanuts',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // doctor profile
    const doctorProfileId = randomUUID()
    await db.collection('DoctorProfile').insertOne({
      _id: doctorProfileId,
      userId: doctorUserId,
      licenseNumber: 'DOC-44321',
      specialization: 'Cardiology',
      yearsExperience: 8,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: adminId,
      hospital: 'Metro General Hospital',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // symptom report
    const symptomReportId = randomUUID()
    await db.collection('SymptomReport').insertOne({
      _id: symptomReportId,
      patientId: patientProfileId,
      symptoms: 'Chest pain with occasional shortness of breath during mild exercise.',
      urgency: 'HIGH',
      likelyConditions: JSON.stringify(['Angina', 'Anxiety']),
      careAdvice: 'Schedule cardiac stress test and monitor vitals. Avoid strenuous activity.',
      locationLat: 40.741,
      locationLng: -73.989,
      aiAnalysis: JSON.stringify({ riskScore: 0.74, recommendations: ['Schedule in-person visit', 'Collect vitals daily'] }),
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // appointment
    const appointmentId = randomUUID()
    await db.collection('Appointment').insertOne({
      _id: appointmentId,
      patientId: patientProfileId,
      doctorId: doctorProfileId,
      symptomReportId: symptomReportId,
      status: 'CONFIRMED',
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      notes: 'Discuss lab results and stress test preparation.',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // prescription
    const prescriptionId = randomUUID()
    await db.collection('Prescription').insertOne({
      _id: prescriptionId,
      doctorId: doctorProfileId,
      patientId: patientProfileId,
      medication: 'Atorvastatin 20mg',
      dosage: '1 tablet daily',
      instructions: 'Take with evening meal',
      startDate: new Date(),
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // messages
    await db.collection('Message').insertMany([
      {
        _id: randomUUID(),
        senderId: doctorUserId,
        receiverId: patientUserId,
        content: 'Please remember to log any symptoms you experience before our appointment.',
        read: false,
        createdAt: new Date()
      },
      {
        _id: randomUUID(),
        senderId: patientUserId,
        receiverId: doctorUserId,
        content: 'Thanks doctor! I will bring my recent vitals as well.',
        read: false,
        createdAt: new Date()
      }
    ])

    // AI log
    await db.collection('AILog').insertOne({
      _id: randomUUID(),
      userId: patientUserId,
      inputType: 'text',
      input: 'Having recurring chest discomfort and slight dizziness.',
      output: 'Recommended immediate teleconsultation and provided breathing exercises.',
      model: 'gemini-pro',
      tokensUsed: 294,
      latency: 1200,
      createdAt: new Date()
    })

    // system config
    await db.collection('SystemConfig').updateOne(
      { key: 'triage_threshold' },
      { $set: { key: 'triage_threshold', value: JSON.stringify({ low: 0.25, medium: 0.5, high: 0.75 }), updatedAt: new Date(), updatedBy: doctorUserId } },
      { upsert: true }
    )

    console.log('✅ Fallback seed complete (MongoClient).')
  } finally {
    await client.close()
  }
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

