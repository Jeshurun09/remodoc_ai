import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔎 Checking seeded data via Prisma...')

  const counts = {
    User: await prisma.user.count(),
    PatientProfile: await prisma.patientProfile.count(),
    DoctorProfile: await prisma.doctorProfile.count(),
    Hospital: await prisma.hospital.count(),
    Appointment: await prisma.appointment.count(),
    Message: await prisma.message.count(),
    Prescription: await prisma.prescription.count(),
    SymptomReport: await prisma.symptomReport.count(),
    AILog: await prisma.aILog.count(),
    SystemConfig: await prisma.systemConfig.count()
  }

  console.table(counts)

  console.log('\n— Sample documents (one each) —')

  const [user, patientProfile, doctorProfile, hospital, appointment, message, prescription, symptomReport, aiLog, systemConfig] = await Promise.all([
    prisma.user.findFirst({ select: { id: true, email: true, name: true, role: true } }),
    prisma.patientProfile.findFirst({ select: { id: true, userId: true, dob: true } }),
    prisma.doctorProfile.findFirst({ select: { id: true, userId: true, licenseNumber: true, specialization: true } }),
    prisma.hospital.findFirst({ select: { id: true, name: true, city: true } }),
    prisma.appointment.findFirst({ select: { id: true, patientId: true, doctorId: true, status: true } }),
    prisma.message.findFirst({ select: { id: true, senderId: true, receiverId: true, content: true } }),
    prisma.prescription.findFirst({ select: { id: true, doctorId: true, patientId: true, medication: true } }),
    prisma.symptomReport.findFirst({ select: { id: true, patientId: true, symptoms: true, urgency: true } }),
    prisma.aILog.findFirst({ select: { id: true, userId: true, inputType: true, model: true } }),
    prisma.systemConfig.findFirst({ select: { id: true, key: true, value: true } })
  ])

  console.log('User:', user)
  console.log('PatientProfile:', patientProfile)
  console.log('DoctorProfile:', doctorProfile)
  console.log('Hospital:', hospital)
  console.log('Appointment:', appointment)
  console.log('Message:', message)
  console.log('Prescription:', prescription)
  console.log('SymptomReport:', symptomReport)
  console.log('AILog:', aiLog)
  console.log('SystemConfig:', systemConfig)
}

main()
  .catch((e) => {
    console.error('Error checking seeded data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
