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
  if (!mongoUrl) throw new Error('MONGODB_URL is required')
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
    'Subscription',
    'HealthRecord',
    'VitalsData',
    'HealthInsight',
    'LifestyleTracking',
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
    },
    {
      name: 'Savannah Heart Institute',
      address: '19 Uhuru Highway',
      city: 'Nairobi',
      state: 'KE',
      zipCode: '00100',
      phone: '+254 700 555 010',
      latitude: -1.286389,
      longitude: 36.817223,
      specialties: JSON.stringify(['Cardiology', 'Telemedicine', 'Emergency']),
      emergency: true,
      active: true
    },
    {
      name: 'Pacific Wellness Center',
      address: '880 Market Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      phone: '(415) 555-1010',
      latitude: 37.7842,
      longitude: -122.407,
      specialties: JSON.stringify(['Dermatology', 'IoT Monitoring', 'Telemedicine']),
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

  const patientInternational = await prisma.user.create({
    data: {
      name: 'Keisha Kamau',
      email: 'patient.ke@remodoc.app',
      password,
      role: UserRole.PATIENT,
      phone: '+254712000123',
      patientProfile: {
        create: {
          dob: new Date('1989-08-22'),
          address: 'Westlands, Nairobi, Kenya',
          emergencyContact: 'Lulu Kamau',
          emergencyPhone: '+254733111222',
          bloodType: 'A-',
          allergies: 'Penicillin'
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

  const doctorTelemed = await prisma.user.create({
    data: {
      name: 'Dr. Noor Qureshi',
      email: 'doctor.global@remodoc.app',
      password,
      role: UserRole.DOCTOR,
      phone: '+447700900321',
      doctorProfile: {
        create: {
          licenseNumber: 'DOC-55882',
          specialization: 'Neurology',
          yearsExperience: 11,
          verificationStatus: DoctorVerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: admin.id,
          hospital: 'Savannah Heart Institute'
        }
      }
    },
    include: {
      doctorProfile: true
    }
  })

  // Create subscriptions
  await (prisma as any).subscription.create({
    data: {
      userId: patient.id,
      plan: 'FREE',
      status: 'ACTIVE'
    }
  })

  await (prisma as any).subscription.create({
    data: {
      userId: doctor.id,
      plan: 'INDIVIDUAL',
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
      paymentMethod: 'stripe'
    }
  })

  await (prisma as any).subscription.create({
    data: {
      userId: patientInternational.id,
      plan: 'STUDENT',
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
      paymentMethod: 'mpesa'
    }
  })

  await (prisma as any).subscription.create({
    data: {
      userId: doctorTelemed.id,
      plan: 'SMALL_GROUP',
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      paymentMethod: 'stripe'
    }
  })

  return { admin, patients: [patient, patientInternational], doctors: [doctor, doctorTelemed] }
}

type MedicalDataOverrides = {
  symptoms?: string
  urgency?: UrgencyLevel
  likelyConditions?: string[]
  careAdvice?: string
  locationLat?: number
  locationLng?: number
  appointmentNotes?: string
  medication?: string
  medicationInstructions?: string
  aiInput?: string
  aiOutput?: string
  healthRecords?: Array<{
    title: string
    description: string
    recordType: string
    fileUrl: string
  }>
  vitalsRecords?: Array<{
    heartRate: number
    spO2: number
    bloodPressureSystolic: number
    bloodPressureDiastolic: number
    temperature: number
    glucose?: number
    deviceType: string
    deviceName: string
    recordedAt: Date
  }>
  insightsRecords?: Array<{
    type: 'tip' | 'alert' | 'reminder'
    title: string
    content: string
    source: string
  }>
  lifestyleRecords?: Array<{
    date: Date
    sleepHours: number
    hydration: number
    steps: number
    activityMinutes: number
    notes: string
  }>
}

async function createMedicalData(
  patientId: string,
  doctorId: string,
  patientProfileId: string,
  overrides: MedicalDataOverrides = {}
) {
  console.log('📋 Creating medical records...')

  const defaults: Required<MedicalDataOverrides> & {
    symptoms: string
    careAdvice: string
    locationLat: number
    locationLng: number
    appointmentNotes: string
    medication: string
    medicationInstructions: string
    aiInput: string
    aiOutput: string
  } = {
    symptoms: 'Chest pain with occasional shortness of breath during mild exercise.',
    urgency: UrgencyLevel.HIGH,
    likelyConditions: ['Angina', 'Anxiety'],
    careAdvice: 'Schedule cardiac stress test and monitor vitals. Avoid strenuous activity.',
    locationLat: 40.741,
    locationLng: -73.989,
    appointmentNotes: 'Discuss lab results and stress test preparation.',
    medication: 'Atorvastatin 20mg',
    medicationInstructions: 'Take with evening meal',
    aiInput: 'Having recurring chest discomfort and slight dizziness.',
    aiOutput: 'Recommended immediate teleconsultation and provided breathing exercises.',
    healthRecords: [
      {
        title: 'Blood Test Results - March 2024',
        description: 'Complete blood count and lipid panel',
        recordType: 'lab_result',
        fileUrl: '/uploads/blood-test-march-2024.pdf'
      },
      {
        title: 'Chest X-Ray',
        description: 'Routine chest X-ray examination',
        recordType: 'image',
        fileUrl: '/uploads/chest-xray.jpg'
      }
    ],
    vitalsRecords: [
      {
        heartRate: 72,
        spO2: 98,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        temperature: 98.6,
        glucose: 95,
        deviceType: 'smartwatch',
        deviceName: 'Apple Watch Series 9',
        recordedAt: new Date()
      },
      {
        heartRate: 75,
        spO2: 97,
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 78,
        temperature: 98.4,
        glucose: 92,
        deviceType: 'fitness_band',
        deviceName: 'Fitbit Charge 6',
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    ],
    insightsRecords: [
      {
        type: 'tip',
        title: 'Stay Hydrated',
        content: 'Drink at least 8 glasses of water daily to maintain optimal health and support cardiovascular function.',
        source: 'WHO'
      },
      {
        type: 'alert',
        title: 'Flu Season Alert',
        content: 'CDC reports increased flu activity in your area. Consider getting vaccinated to protect yourself.',
        source: 'CDC'
      },
      {
        type: 'reminder',
        title: 'Medication Reminder',
        content: 'Remember to take your Atorvastatin with your evening meal as prescribed.',
        source: 'AI'
      }
    ],
    lifestyleRecords: [
      {
        date: new Date(),
        sleepHours: 7.5,
        hydration: 2000,
        steps: 8500,
        activityMinutes: 35,
        notes: 'Good day, felt energetic after morning walk'
      },
      {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24),
        sleepHours: 8,
        hydration: 1800,
        steps: 10200,
        activityMinutes: 45,
        notes: 'Completed 10k steps goal!'
      }
    ]
  }

  const settings = { ...defaults, ...overrides }

  const symptomReport = await prisma.symptomReport.create({
    data: {
      patientId: patientProfileId!,
      symptoms: settings.symptoms,
      urgency: settings.urgency!,
      likelyConditions: JSON.stringify(settings.likelyConditions),
      careAdvice: settings.careAdvice,
      locationLat: settings.locationLat,
      locationLng: settings.locationLng,
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
      medication: settings.medication,
      dosage: '1 tablet daily',
      instructions: settings.medicationInstructions,
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
      input: settings.aiInput,
      output: settings.aiOutput,
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

  // Create premium feature data
  console.log('💎 Creating premium feature data...')

  // Health Records
  for (const record of settings.healthRecords) {
    await (prisma as any).healthRecord.create({
      data: {
        userId: patientId,
        ...record,
        encrypted: true
      }
    })
  }

  // Vitals Data
  for (const record of settings.vitalsRecords) {
    await (prisma as any).vitalsData.create({
      data: {
        userId: patientId,
        ...record
      }
    })
  }

  // Health Insights
  for (const record of settings.insightsRecords) {
    await (prisma as any).healthInsight.create({
      data: {
        userId: patientId,
        ...record,
        read: false
      }
    })
  }

  // Lifestyle Tracking
  for (const record of settings.lifestyleRecords) {
    await (prisma as any).lifestyleTracking.create({
      data: {
        userId: patientId,
        ...record
      }
    })
  }

  console.log(`✅ Created appointment ${appointment.id} and linked records.`)
}

async function main() {
  await resetDatabase()

  try {
    await createHospitals()
    const { patients, doctors } = await createUsers()
    const [primaryPatient, internationalPatient] = patients
    const [primaryDoctor, telemedDoctor] = doctors

    const primaryProfileId = (primaryPatient as any).patientProfile?.id
    const internationalProfileId = (internationalPatient as any).patientProfile?.id

    if (!primaryProfileId || !internationalProfileId) {
      throw new Error('Patient profiles were not created')
    }

    await createMedicalData(primaryPatient.id, primaryDoctor.id, primaryProfileId)
    await createMedicalData(internationalPatient.id, telemedDoctor.id, internationalProfileId, {
      symptoms: 'Persistent migraines with occasional blurred vision.',
      urgency: UrgencyLevel.MEDIUM,
      likelyConditions: ['Migraine', 'Hypertension'],
      careAdvice: 'Track triggers, maintain hydration, schedule neuro consult.',
      locationLat: -1.2921,
      locationLng: 36.8219,
      appointmentNotes: 'Evaluate impact of migraines on work schedule.',
      medication: 'Sumatriptan 50mg',
      medicationInstructions: 'Take at migraine onset. Do not exceed 2 tablets per day.',
      aiInput: 'Severe headaches twice a week with sensitivity to light.',
      aiOutput: 'Suggested keeping a migraine diary and practicing guided breathing.',
      healthRecords: [
        {
          title: 'MRI Brain Scan',
          description: 'Baseline MRI to rule out structural issues',
          recordType: 'image',
          fileUrl: '/uploads/mri-brain.jpg'
        },
        {
          title: 'Allergy Panel',
          description: 'Identified mild dust allergy',
          recordType: 'lab_result',
          fileUrl: '/uploads/allergy-panel.pdf'
        }
      ],
      vitalsRecords: [
        {
          heartRate: 68,
          spO2: 99,
          bloodPressureSystolic: 115,
          bloodPressureDiastolic: 76,
          temperature: 98.2,
          deviceType: 'smart_ring',
          deviceName: 'Oura Ring 3',
          recordedAt: new Date()
        },
        {
          heartRate: 70,
          spO2: 98,
          bloodPressureSystolic: 117,
          bloodPressureDiastolic: 77,
          temperature: 98.1,
          deviceType: 'smartwatch',
          deviceName: 'Samsung Galaxy Watch 6',
          recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 12)
        }
      ],
      insightsRecords: [
        {
          type: 'tip',
          title: 'Blue Light Breaks',
          content: 'Use 20-20-20 rule when working on screens to reduce migraine triggers.',
          source: 'AI Coach'
        },
        {
          type: 'alert',
          title: 'High Pollen Count',
          content: 'Outdoor pollen levels are high in Nairobi today. Keep antihistamines nearby.',
          source: 'Met Office'
        }
      ],
      lifestyleRecords: [
        {
          date: new Date(),
          sleepHours: 6.5,
          hydration: 1600,
          steps: 6200,
          activityMinutes: 20,
          notes: 'Slept late finishing client deadline.'
        },
        {
          date: new Date(Date.now() - 1000 * 60 * 60 * 24),
          sleepHours: 7.2,
          hydration: 2100,
          steps: 9400,
          activityMinutes: 30,
          notes: 'Morning yoga helped reduce headache severity.'
        }
      ]
    })
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
  if (!mongoUrl) throw new Error('MONGODB_URL is required')
  const client = new MongoClient(mongoUrl)

  try {
    await client.connect()
    const db = client.db()

    // create hospitals
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
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
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
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    await db.collection('Hospital').insertMany(hospitals)

    const passwordHash = await bcrypt.hash('Password123!', 10)

    // users
    const admin = {
      email: 'admin@remodoc.app',
      password: passwordHash,
      name: 'Amelia Admin',
      role: 'ADMIN',
      phone: '+15555550100',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const patient = {
      email: 'patient@remodoc.app',
      password: passwordHash,
      name: 'Peter Patient',
      role: 'PATIENT',
      phone: '+15555550101',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const doctor = {
      email: 'doctor@remodoc.app',
      password: passwordHash,
      name: 'Derek Doctor',
      role: 'DOCTOR',
      phone: '+15555550102',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const adminResult = await db.collection('User').insertOne(admin)
    const patientResult = await db.collection('User').insertOne(patient)
    const doctorResult = await db.collection('User').insertOne(doctor)

    const adminId = adminResult.insertedId.toString()
    const patientUserId = patientResult.insertedId.toString()
    const doctorUserId = doctorResult.insertedId.toString()

    // patient profile
    const patientProfileResult = await db.collection('PatientProfile').insertOne({
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
    const patientProfileId = patientProfileResult.insertedId.toString()

    // doctor profile
    const doctorProfileResult = await db.collection('DoctorProfile').insertOne({
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
    const doctorProfileId = doctorProfileResult.insertedId.toString()

    // symptom report
    const symptomReportResult = await db.collection('SymptomReport').insertOne({
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
    const symptomReportId = symptomReportResult.insertedId.toString()

    // appointment
    await db.collection('Appointment').insertOne({
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
    await db.collection('Prescription').insertOne({
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
        senderId: doctorUserId,
        receiverId: patientUserId,
        content: 'Please remember to log any symptoms you experience before our appointment.',
        read: false,
        createdAt: new Date()
      },
      {
        senderId: patientUserId,
        receiverId: doctorUserId,
        content: 'Thanks doctor! I will bring my recent vitals as well.',
        read: false,
        createdAt: new Date()
      }
    ])

    // AI log
    await db.collection('AILog').insertOne({
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

    // subscriptions
    await db.collection('Subscription').insertMany([
      {
        userId: patientUserId,
        plan: 'FREE',
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: doctorUserId,
        plan: 'INDIVIDUAL',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
        paymentMethod: 'stripe',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])

    // health records
    await db.collection('HealthRecord').insertMany([
      {
        userId: patientUserId,
        title: 'Blood Test Results - March 2024',
        description: 'Complete blood count and lipid panel',
        recordType: 'lab_result',
        fileUrl: '/uploads/blood-test-march-2024.pdf',
        encrypted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: patientUserId,
        title: 'Chest X-Ray',
        description: 'Routine chest X-ray examination',
        recordType: 'image',
        fileUrl: '/uploads/chest-xray.jpg',
        encrypted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])

    // vitals data
    await db.collection('VitalsData').insertMany([
      {
        userId: patientUserId,
        heartRate: 72,
        spO2: 98,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        temperature: 98.6,
        glucose: 95,
        deviceType: 'smartwatch',
        deviceName: 'Apple Watch Series 9',
        recordedAt: new Date(),
        createdAt: new Date()
      },
      {
        userId: patientUserId,
        heartRate: 75,
        spO2: 97,
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 78,
        temperature: 98.4,
        deviceType: 'fitness_band',
        deviceName: 'Fitbit Charge 6',
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        createdAt: new Date()
      }
    ])

    // health insights
    await db.collection('HealthInsight').insertMany([
      {
        userId: patientUserId,
        type: 'tip',
        title: 'Stay Hydrated',
        content: 'Drink at least 8 glasses of water daily to maintain optimal health and support cardiovascular function.',
        source: 'WHO',
        read: false,
        createdAt: new Date()
      },
      {
        userId: patientUserId,
        type: 'alert',
        title: 'Flu Season Alert',
        content: 'CDC reports increased flu activity in your area. Consider getting vaccinated to protect yourself.',
        source: 'CDC',
        read: false,
        createdAt: new Date()
      },
      {
        userId: patientUserId,
        type: 'reminder',
        title: 'Medication Reminder',
        content: 'Remember to take your Atorvastatin with your evening meal as prescribed.',
        source: 'AI',
        read: false,
        createdAt: new Date()
      }
    ])

    // lifestyle tracking
    await db.collection('LifestyleTracking').insertMany([
      {
        userId: patientUserId,
        date: new Date(),
        sleepHours: 7.5,
        hydration: 2000,
        steps: 8500,
        activityMinutes: 35,
        notes: 'Good day, felt energetic after morning walk',
        createdAt: new Date()
      },
      {
        userId: patientUserId,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        sleepHours: 8,
        hydration: 1800,
        steps: 10200,
        activityMinutes: 45,
        notes: 'Completed 10k steps goal!',
        createdAt: new Date()
      }
    ])

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

